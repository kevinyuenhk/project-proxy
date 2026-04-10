// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "BonsaiEngine",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "BonsaiEngine", targets: ["BonsaiEngine"]),
    ],
    dependencies: [
        // PrismML fork of mlx-swift — includes MLXLLM, MLXLMCommon bundled
        .package(url: "https://github.com/PrismML-Eng/mlx-swift", branch: "prism"),
    ],
    targets: [
        .target(
            name: "BonsaiEngine",
            dependencies: [
                .product(name: "MLXLLM", package: "mlx-swift"),
                .product(name: "MLXLMCommon", package: "mlx-swift"),
            ]
        ),
    ]
)
