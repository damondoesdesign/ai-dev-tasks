// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PackingListCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "PackingListCore", targets: ["PackingListCore"])
    ],
    targets: [
        .target(name: "PackingListCore"),
        .testTarget(
            name: "PackingListCoreTests",
            dependencies: ["PackingListCore"]
        )
    ]
)
