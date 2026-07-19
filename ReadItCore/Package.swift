// swift-tools-version: 5.9
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
