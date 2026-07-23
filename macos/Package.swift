// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CamDocFormater",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "CamDocFormater", targets: ["CamDocFormater"]),
    ],
    targets: [
        .executableTarget(
            name: "CamDocFormater",
            path: "Sources/CamDocFormater"
        ),
        .testTarget(
            name: "CamDocFormaterTests",
            dependencies: ["CamDocFormater"],
            path: "Tests"
        ),
    ]
)