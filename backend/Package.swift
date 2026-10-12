// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "Synapp",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.121.4")
    ],
    targets: [
        .executableTarget(name: "App", dependencies: [
            .product(name: "Vapor", package: "vapor")
        ], exclude: ["Services/README.md"]),
        .testTarget(name: "AppTests", dependencies: [
            .target(name: "App"),
            .product(name: "XCTVapor", package: "vapor")
        ])
    ]
)

