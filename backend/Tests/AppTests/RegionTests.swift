import XCTest
@testable import App

final class RegionTests: XCTestCase {
    func testRegionIdentifiersAreUniqueAndIncludeBothSides() {
        let ids = BodyRegion.all.map(\.id)
        XCTAssertEqual(ids.count, 37)
        XCTAssertEqual(Set(ids).count, ids.count)
        XCTAssertTrue(ids.contains("left_knee"))
        XCTAssertTrue(ids.contains("right_knee"))
        XCTAssertTrue(ids.contains("lower_back"))
        for area in BodyRegion.pairedAreas {
            XCTAssertTrue(ids.contains("left_\(area)"))
            XCTAssertTrue(ids.contains("right_\(area)"))
        }
        for area in ["head", "neck", "abdomen", "upper_back"] {
            XCTAssertTrue(ids.contains(area))
        }
    }
}

