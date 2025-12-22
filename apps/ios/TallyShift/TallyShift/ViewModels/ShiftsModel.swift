//
//  ShiftsModel.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/21/25.
//

import Foundation


struct Shift: Identifiable {
    var id: UUID = UUID()

    // Source-of-truth timestamps (handles overnight shifts cleanly)
    var start: Date
    var end: Date

    // Support zero, one, or many breaks
    var breaks: [Break] = []

    // Derived totals
    var totalBreakMinutes: Int { //longhand for educational review
        var total = 0
        for oneBreak in breaks {
            total = total + oneBreak.durationMinutes
        }
        return total
    }

//    var unpaidBreakMinutes: Int {
//        breaks.filter { !$0.isPaid }.reduce(0) { $0 + $1.durationMinutes }
//    }
    
    var unpaidBreakMinutes: Int {
        var total = 0
        for oneBreak in breaks {
            if !oneBreak.isPaid {
                total = total + oneBreak.durationMinutes
            }
        }
        return total
    }

    var paidBreakMinutes: Int {
        breaks.filter { $0.isPaid }.reduce(0) { $0 + $1.durationMinutes }
    }

    // Keep this simple for v1; you can replace with a Job model later
    var job: String

    // Notes are often optional
    var notes: String? = nil
}

struct Break: Identifiable {
    var id: UUID = UUID()
    var startTime: Date
    var endTime: Date
    
    var durationMinutes: Int {
        let interval = endTime.timeIntervalSince(startTime)
        return Int(interval / 60)
    }
    var isPaid: Bool
}

let newShift = Shift(
    start: Date(),
    end: Date(),
    job: "Supervisor"
)
