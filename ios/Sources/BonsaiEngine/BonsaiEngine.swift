// BonsaiEngine.swift
// Project Proxy — On-device Bonsai model inference via MLX (PrismML fork)

import Foundation
import MLX
import MLXNN
import MLXLM
import MLXLMCommon

/// Manages model loading, unloading, and text generation.
///
/// Uses PrismML-Eng/mlx-swift (prism branch) for 1-bit quantization kernels
/// and ml-explore/mlx-swift-lm for the LLM evaluation layer.
public actor BonsaiEngine {

    public struct ModelConfig: Sendable {
        public let id: String
        public let repoId: String
        public let displayName: String
        public let sizeBytes: Int64

        public init(id: String, repoId: String, displayName: String, sizeBytes: Int64) {
            self.id = id
            self.repoId = repoId
            self.displayName = displayName
            self.sizeBytes = sizeBytes
        }
    }

    public static let availableModels: [ModelConfig] = [
        ModelConfig(id: "Bonsai-8B-mlx-1bit", repoId: "prism-ml/Bonsai-8B-mlx-1bit",
                     displayName: "Bonsai 8B", sizeBytes: 1_150_000_000),
        ModelConfig(id: "Bonsai-4B-mlx-1bit", repoId: "prism-ml/Bonsai-4B-mlx-1bit",
                     displayName: "Bonsai 4B", sizeBytes: 570_000_000),
        ModelConfig(id: "Bonsai-1.7B-mlx-1bit", repoId: "prism-ml/Bonsai-1.7B-mlx-1bit",
                     displayName: "Bonsai 1.7B", sizeBytes: 270_000_000),
    ]

    public enum EngineError: Error, LocalizedError {
        case modelNotLoaded
        case modelNotFound(String)
        case generationError(String)
        case downloadFailed(String)

        public var errorDescription: String? {
            switch self {
            case .modelNotLoaded: return "No model is currently loaded"
            case .modelNotFound(let id): return "Model not found: \(id)"
            case .generationError(let msg): return "Generation error: \(msg)"
            case .downloadFailed(let msg): return "Download failed: \(msg)"
            }
        }
    }

    // MARK: - State

    private var currentModel: ModelConfig?
    private var modelContainer: ModelContainer?
    private var tokenizer: Tokenizer?
    private var isGenerating = false

    /// Directory for cached model weights
    private let modelsDirectory: URL

    public init(modelsDirectory: URL? = nil) {
        // Default to app's Documents/Models
        let defaults = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        self.modelsDirectory = modelsDirectory
            ?? defaults[0].appendingPathComponent("Models", isDirectory: true)
        try? FileManager.default.createDirectory(at: self.modelsDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Model Management

    /// Load a model by its ID. Downloads from HuggingFace if not cached.
    public func loadModel(_ modelId: String) async throws {
        guard let config = Self.availableModels.first(where: { $0.id == modelId }) else {
            throw EngineError.modelNotFound(modelId)
        }

        // Unload current model if any
        unloadModel()

        let modelDir = modelsDirectory.appendingPathComponent(modelId, isDirectory: true)

        // Download if needed
        if !FileManager.default.fileExists(atPath: modelDir.path) {
            try await downloadModel(config: config, to: modelDir)
        }

        // Load via MLXLM
        let modelPath = modelDir.appendingPathComponent("model.safetensors")
        let configPath = modelDir.appendingPathComponent("config.json")

        guard FileManager.default.fileExists(atPath: modelPath.path),
              FileManager.default.fileExists(atPath: configPath.path) else {
            throw EngineError.generationError("Model files not found in \(modelDir.path)")
        }

        // Use MLXLM's ModelRegistry or direct loading
        // Note: Bonsai models use standard Llama architecture — try Llama registry first
        do {
            let container = try await LLMModelFactory.shared.loadContainer(
                directory: modelDir
            )
            self.modelContainer = container
            self.tokenizer = container.tokenizer
            self.currentModel = config
        } catch {
            throw EngineError.generationError("Failed to load model: \(error.localizedDescription)")
        }
    }

    public func unloadModel() {
        modelContainer = nil
        tokenizer = nil
        currentModel = nil
    }

    public func getLoadedModel() -> ModelConfig? {
        currentModel
    }

    public func getModels() -> [[String: Any]] {
        Self.availableModels.map { config in
            [
                "id": config.id,
                "repoId": config.repoId,
                "displayName": config.displayName,
                "sizeBytes": config.sizeBytes,
            ]
        }
    }

    // MARK: - Generation

    /// Generate a complete response (non-streaming).
    public func generate(messages: [[String: String]],
                         systemPrompt: String? = nil) async throws -> String {
        guard let container = modelContainer, let tokenizer = tokenizer else {
            throw EngineError.modelNotLoaded
        }

        let prompt = buildPrompt(messages: messages, systemPrompt: systemPrompt)
        let inputTokens = tokenizer.encode(text: prompt)

        var result = ""
        let startTime = CFAbsoluteTimeGetCurrent()
        var tokensGenerated = 0

        for try await token in container.generate(inputTokens: inputTokens) {
            result += token
            tokensGenerated += 1

            // Stop on EOS
            if result.hasSuffix("<|endoftext|>") || result.hasSuffix("</s>") {
                break
            }
        }

        let elapsed = CFAbsoluteTimeGetCurrent() - startTime
        let tps = elapsed > 0 ? Double(tokensGenerated) / elapsed : 0
        print("[BonsaiEngine] Generated \(tokensGenerated) tokens in \(String(format: "%.2f", elapsed))s (\(String(format: "%.1f", tps)) t/s)")

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Generate with streaming callback. Call `stopGeneration()` to cancel.
    public func generateStream(messages: [[String: String]],
                               systemPrompt: String? = nil,
                               onToken: @escaping @Sendable (String) -> Void) async throws -> String {
        guard let container = modelContainer, let tokenizer = tokenizer else {
            throw EngineError.modelNotLoaded
        }

        isGenerating = true
        defer { isGenerating = false }

        let prompt = buildPrompt(messages: messages, systemPrompt: systemPrompt)
        let inputTokens = tokenizer.encode(text: prompt)

        var result = ""
        let startTime = CFAbsoluteTimeGetCurrent()
        var tokensGenerated = 0

        for try await token in container.generate(inputTokens: inputTokens) {
            guard isGenerating else { break }

            result += token
            tokensGenerated += 1
            onToken(token)

            if result.hasSuffix("<|endoftext|>") || result.hasSuffix("</s>") {
                break
            }
        }

        let elapsed = CFAbsoluteTimeGetCurrent() - startTime
        let tps = elapsed > 0 ? Double(tokensGenerated) / elapsed : 0
        print("[BonsaiEngine] Streamed \(tokensGenerated) tokens in \(String(format: "%.2f", elapsed))s (\(String(format: "%.1f", tps)) t/s)")

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public func stopGeneration() {
        isGenerating = false
    }

    public func getPerformance() -> [String: Any] {
        // Memory usage via MLX
        let memoryUsed = MLX.GPU.activeMemory / (1024 * 1024) // MB
        return [
            "memoryUsedMB": memoryUsed,
            "modelLoaded": currentModel != nil,
            "modelName": currentModel?.displayName ?? "none",
        ]
    }

    // MARK: - Private

    private func buildPrompt(messages: [[String: String]], systemPrompt: String?) -> String {
        var parts: [String] = []

        if let system = systemPrompt, !system.isEmpty {
            parts.append("<|system|>\n\(system)</s>")
        }

        for msg in messages {
            let role = msg["role"] ?? "user"
            let content = msg["content"] ?? ""
            parts.append("<|\(role)|>\n\(content)</s>")
        }

        parts.append("<|assistant| >\n")
        return parts.joined(separator: "\n")
    }

    private func downloadModel(config: ModelConfig, to destination: URL) async throws {
        print("[BonsaiEngine] Downloading \(config.repoId) to \(destination.path)...")

        // Use HuggingFace Hub API to download model files
        // For iOS, we download individual files rather than cloning
        let files = ["config.json", "tokenizer.json", "tokenizer.model", "tokenizer_config.json"]

        // Discover safetensors shards from the repo
        // Bonsai models typically have: model.safetensors.index.json + model-00001-of-0000N.safetensors
        let baseUrl = "https://huggingface.co/\(config.repoId)/resolve/main"

        // Try to get the file listing
        let infoUrl = URL(string: "https://huggingface.co/api/models/\(config.repoId)")!
        var request = URLRequest(url: infoUrl)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 else {
            throw EngineError.downloadFailed("Failed to fetch model info from HuggingFace")
        }

        // Parse sibling files
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let siblings = json["siblings"] as? [[String: Any]] {
            let safetensorsFiles = siblings
                .compactMap { $0["rfilename"] as? String }
                .filter { $0.hasSuffix(".safetensors") && !$0.contains("index") }

            for file in safetensorsFiles {
                files.append(file)
            }

            // Also grab the index file
            if let indexFile = siblings.compactMap({ $0["rfilename"] as? String })
                .first(where: { $0.hasSuffix(".safetensors.index.json") }) {
                files.append(indexFile)
            }
        }

        try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)

        // Download each file with progress
        for file in files {
            let fileUrl = URL(string: "\(baseUrl)/\(file)")!
            let destPath = destination.appendingPathComponent(file)

            print("[BonsaiEngine] Downloading \(file)...")
            let (fileData, fileResp) = try await URLSession.shared.data(from: fileUrl)

            guard let fileHttpResp = fileResp as? HTTPURLResponse, fileHttpResp.statusCode == 200 else {
                throw EngineError.downloadFailed("Failed to download \(file)")
            }

            try fileData.write(to: destPath)
        }

        print("[BonsaiEngine] Download complete.")
    }
}
