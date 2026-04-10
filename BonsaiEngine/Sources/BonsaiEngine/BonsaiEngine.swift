import Foundation
import MLXLLM
import MLXLMCommon

/// Errors specific to BonsaiEngine operations.
public enum BonsaiError: Error, LocalizedError {
    case noModelLoaded
    case modelNotFound(modelId: String)
    case generationError(String)
    case invalidModelId(String)

    public var errorDescription: String? {
        switch self {
        case .noModelLoaded:
            return "No model is currently loaded."
        case .modelNotFound(let id):
            return "Model '\(id)' not found in registry."
        case .generationError(let msg):
            return "Generation error: \(msg)"
        case .invalidModelId(let id):
            return "Invalid model ID: \(id)"
        }
    }
}

/// Manages Bonsai LLM lifecycle: loading, generation, and streaming.
///
/// Usage:
/// ```swift
/// let engine = BonsaiEngine()
/// try await engine.loadModel(modelId: "Bonsai-8B-mlx-1bit")
/// let response = try await engine.generate(prompt: "Hello!")
/// ```
public actor BonsaiEngine {

    // MARK: - Public State

    public private(set) var isModelLoaded: Bool = false
    public private(set) var currentModelId: String?

    // MARK: - Private State

    private var modelContainer: ModelContainer?
    private var evaluate: (any Evaluate)?
    private var isGenerating = false

    // MARK: - Load Model

    /// Load a Bonsai model by its model ID (e.g. "Bonsai-8B-mlx-1bit").
    ///
    /// Downloads from HuggingFace if not cached locally.
    /// Note: The Bonsai MLX repos may be private — set `PRISM_HF_TOKEN` env var
    /// or pass a token via the HubClient.
    public func loadModel(modelId: String) async throws {
        guard let modelSpec = BonsaiModels.from(modelId: modelId) else {
            throw BonsaiError.invalidModelId(modelId)
        }

        // Unload previous model if any
        if isModelLoaded {
            await unloadModel()
        }

        let hub = HubClient.default

        // Load model container from HuggingFace
        // Note: If the repo is private, HubClient needs a token.
        // Users should set PRISM_HF_TOKEN env var or configure HubClient accordingly.
        let container = try await loadModelContainer(
            from: hub,
            using: TokenizersLoader(),
            id: modelSpec.hfRepoId
        )

        self.modelContainer = container
        self.currentModelId = modelId
        self.isModelLoaded = true
    }

    /// Load a model from a local directory URL (bypasses HuggingFace download).
    public func loadModelFromDirectory(_ url: URL) async throws {
        if isModelLoaded {
            await unloadModel()
        }

        let container = try await loadModelContainer(
            from: url,
            using: TokenizersLoader()
        )

        self.modelContainer = container
        // Try to infer model ID from directory name
        self.currentModelId = url.lastPathComponent
        self.isModelLoaded = true
    }

    // MARK: - Unload

    public func unloadModel() async {
        modelContainer = nil
        evaluate = nil
        currentModelId = nil
        isModelLoaded = false
    }

    // MARK: - Generate (Full)

    /// Generate a complete response for the given prompt.
    public func generate(prompt: String, systemPrompt: String? = nil) async throws -> String {
        guard let container = modelContainer else {
            throw BonsaiError.noModelLoaded
        }

        let session = ChatSession(model: container)

        if let system = systemPrompt {
            session.systemPrompt = system
        }

        return try await session.respond(to: prompt)
    }

    // MARK: - Generate (Streaming)

    /// Stream tokens via a callback. Call `stopGeneration()` to cancel.
    public func stream(
        prompt: String,
        systemPrompt: String? = nil,
        onToken: @escaping @Sendable (String) -> Void
    ) async throws {
        guard let container = modelContainer else {
            throw BonsaiError.noModelLoaded
        }

        isGenerating = true

        do {
            // Build messages
            var messages: [Message] = []
            if let system = systemPrompt {
                messages.append(.init(role: .system, content: system))
            }
            messages.append(.init(role: .user, content: prompt))

            // Stream using the model's generate method with a token handler
            let result = try await container.model.generate(
                input: .init(messages: messages),
                extraEOSTokens: container.tokenizer.extraEOSTokens,
                temperature: 0.6,
                topP: 0.9
            ) { tokens in
                guard self.isGenerating else { return false } // stop signal
                let text = container.tokenizer.decode(tokens: tokens)
                onToken(text)
                return true // continue
            }

            if !isGenerating {
                onToken("\n[stopped]")
            }
        } catch {
            if isGenerating {
                throw BonsaiError.generationError(error.localizedDescription)
            }
            // Silently exit if we stopped intentionally
        }

        isGenerating = false
    }

    // MARK: - Stop

    /// Stop the current generation/stream.
    public func stopGeneration() {
        isGenerating = false
    }

    // MARK: - Model Info

    /// Get list of available Bonsai models as JSON-serializable dicts.
    public func getModels() -> [[String: String]] {
        BonsaiModels.allModelsJSON()
    }
}
