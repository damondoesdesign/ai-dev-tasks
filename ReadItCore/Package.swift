// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ReadItCore",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(name: "ReadItCore", targets: ["ReadItCore"])
    ],
    targets: [
        .target(name: "ReadItCore"),
        .testTarget(
            name: "ReadItCoreTests",
            dependencies: ["ReadItCore"]
        )
    ]
)
