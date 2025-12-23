//
//  ShiftStore.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/22/25.
//

import Foundation
import Combine
import SwiftUI

// MARK: - App Storage - Shifts

@MainActor
final class ShiftStore: ObservableObject {
    @Published var shifts: [Shift]

    init(shifts: [Shift] = []) {
        self.shifts = shifts
    }
    
    // MARK: Functions
    func add(_ shift: Shift) {
        shifts.insert(shift, at: 0)
    }
    
    func delete(at offsets: IndexSet) {
        shifts.remove(atOffsets: offsets)
    }
    
    // MARK: - Sample data (for previews / early UI wiring)
    static func sample() -> ShiftStore {
        let now = Date()
        let start = Calendar.current.date(byAdding: .hour, value: -8, to: now) ?? now
        let end = now

        let unpaidBreak = Break(
            startTime: Calendar.current.date(byAdding: .minute, value: -60, to: end) ?? end,
            endTime: Calendar.current.date(byAdding: .minute, value: -30, to: end) ?? end,
            isPaid: false
        )

        let paidBreak = Break(
            startTime: Calendar.current.date(byAdding: .minute, value: -120, to: end) ?? end,
            endTime: Calendar.current.date(byAdding: .minute, value: -110, to: end) ?? end,
            isPaid: true
        )

        let sampleShift = Shift(
            start: start,
            end: end,
            breaks: [paidBreak, unpaidBreak],
            job: "HHIFR"
        )

        return ShiftStore(shifts: [sampleShift])
    }
}
