import Foundation

/// Registry of available Bonsai models on HuggingFace (MLX 1-bit quantized).
public enum BonsaiModels: String, CaseIterable, Identifiable, Sendable {
    case bonsai17B = "Bonsai-1.7B-mlx-1bit"
    case bonsai4B  = "Bonsai-4B-mlx-1bit"
    case bonsai8B  = "Bonsai-8B-mlx-1bit"

    public var id: String { rawValue }

    /// Full HuggingFace repo identifier (may be private — requires HF token).
    public var hfRepoId: String { "prism-ml/\(rawValue)" }

    /// Human-readable display name.
    public var displayName: String {
        switch self {
        case .bonsai17B: return "Bonsai 1.7B"
        case .bonsai4B:  return "Bonsai 4B"
        case .bonsai8B:  return "Bonsai 8B"
        }
    }

    /// Estimated VRAM usage (rough guide for Apple Silicon).
    public var estimatedVRAM: String {
        switch self {
        case .bonsai17B: return "~2 GB"
        case .bonsai4B:  return "~4 GB"
        case .bonsai8B:  return "~6 GB"
        }
    }

    /// Look up a model by its modelId string.
    public static func from(modelId: String) -> BonsaiModels? {
        BonsaiModels.allCases.first { $0.id == modelId }
    }

    /// JSON-serializable list of available models for the web frontend.
    public static func allModelsJSON() -> [[String: String]] {
        allCases.map { model in
            [
                "id": model.id,
                "name": model.displayName,
                "repo": model.hfRepoId,
                "vram": model.estimatedVRAM,
            ]
        }
    }
}
