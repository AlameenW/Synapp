import XCTest
@testable import App

final class RegionTests: XCTestCase {
    func testRegionIdentifiersAreUniqueAndIncludeBothSides() {
        let ids = BodyRegion.all.map(\.id)
        XCTAssertEqual(ids.count, 11)
        XCTAssertEqual(Set(ids).count, ids.count)
        XCTAssertTrue(ids.contains("left_knee"))
        XCTAssertTrue(ids.contains("right_knee"))
        XCTAssertTrue(ids.contains("lower_back"))
    }
}

