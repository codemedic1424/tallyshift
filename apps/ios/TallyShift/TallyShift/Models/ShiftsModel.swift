//
//  ShiftsModel.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/21/25.
//

import Foundation

var shifts: [Shift] = []

struct Shift: Identifiable {
    var id: UUID = UUID()
    
    // Source-of-truth timestamps (handles overnight shifts cleanly)
    var start: Date
    var end: Date
    
    // Support zero, one, or many breaks
    var breaks: [Break] = []
    
    // MARK: Derived totals
    var totalBreakMinutes: Int { //longhand for educational review
        var total = 0
        for oneBreak in breaks {
            total = total + oneBreak.durationMinutes
        }
        return total
    }
    
    // TODO: Review change in line 33-45 - Reflect on changes and see benefit
    
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
    
    var workedMinutes: Int {
        let shiftSeconds = end.timeIntervalSince(start)
        let shiftMinutes = Int(shiftSeconds / 60)
        return shiftMinutes - unpaidBreakMinutes
    }
    
    var shiftDurationMinutes: Int {
        let shiftSeconds = end.timeIntervalSince(start)
        let shiftDuration = Int(shiftSeconds / 60)
        return shiftDuration
    }
    
    // MARK: Shift validity check and return invalid reason via enums switch statement
    var isShiftValid: Bool {
        invalidReason == nil
    }
    
    enum InvalidShiftReason {
        case invalidShiftTimes
        case exceedsMaxDuration
        
        var severity: ValidationSeverity {
            switch self {
            case .invalidShiftTimes:
                return .error
            case .exceedsMaxDuration:
                return .error
            }
        }
        
        var description: String {
            switch self {
            case .invalidShiftTimes:
                return "End time must be after start time."
            case .exceedsMaxDuration:
                return "Shift cannot exceed 24 hours."
            }
        }
    }
    
    static let maxShiftMinutes = 24 * 60
    
    var invalidReason: InvalidShiftReason? {
        if end <= start {
            return .invalidShiftTimes
        }
        
        if shiftDurationMinutes > Self.maxShiftMinutes {
            return .exceedsMaxDuration
        }
        
        return nil
    }
    
    enum ValidationSeverity {
        case error
        case warning
    }
    
    // May diverge from isShiftValid when warnings are introduced
    var canBeSaved: Bool {
        isShiftValid
    }
    
    var validationSeverity: ValidationSeverity? {
        invalidReason?.severity
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



