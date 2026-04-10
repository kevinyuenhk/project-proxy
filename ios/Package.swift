// swift-tools-version: 5.12
import PackageDescription

let package = Package(
  name: "ProjectProxy",
  platforms: [.iOS(.v17)],
  products: [
    .library(name: "BonsaiPlugin", targets: ["BonsaiPlugin"]),
    .library(name: "BonsaiEngine", targets: ["BonsaiEngine"]),
  ],
  dependencies: [
    // PrismML's MLX Swift fork — REQUIRED for 1-bit quantization support.
    .package(url: "https://github.com/PrismML-Eng/mlx-swift.git", branch: "prism"),
    // Upstream mlx-swift-lm. Its MLX dependency is satisfied by PrismML fork above.
    .package(url: "https://github.com/ml-explore/mlx-swift-lm.git", branch: "main"),
  ],
  targets: [
    .target(
      name: "BonsaiEngine",
      dependencies: [
        .product(name: "MLX", package: "mlx-swift"),
        .product(name: "MLXNN", package: "mlx-swift"),
        .product(name: "MLXLLM", package: "mlx-swift-lm"),
        .product(name: "MLXLMCommon", package: "mlx-swift-lm"),
      ],
      path: "Sources/BonsaiEngine"
    ),
    .target(
      name: "BonsaiPlugin",
      dependencies: ["BonsaiPluginObjC"],
      path: "Sources/BonsaiPlugin"
    ),
    .target(
      name: "BonsaiPluginObjC",
      dependencies: [],
      path: "Sources/BonsaiPluginObjC",
      publicHeadersPath: "include"
    ),
  ]
)
