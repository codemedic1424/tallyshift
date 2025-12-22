//
//  ShiftModelScratch.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/21/25.
//

import Foundation

// MARK: - Testing Scripts

func debugPrintShift(_ shift: Shift) {
    print("----- SHIFT DEBUG -----")
    print("Start:", shift.start)
    print("End:", shift.end)
    print("Shift duration (min):", shift.shiftDurationMinutes)
    print("Worked minutes:", shift.workedMinutes)
    print("Total break minutes:", shift.totalBreakMinutes)
    print("Unpaid break minutes:", shift.unpaidBreakMinutes)
    print("Paid break minutes:", shift.paidBreakMinutes)
    print("Is valid:", shift.isShiftValid)
    print("Can be saved:", shift.canBeSaved)
    
    if let reason = shift.invalidReason {
        print("Invalid reason:", reason.description)
        print("Severity:", reason.severity)
    } else {
        print("No validation issues.")
    }
    
    print("-----------------------\n")
}

//// MARK: - Valid Shift
//
//let now = Date()
//
//let validShift = Shift(
//    start: now,
//    end: now.addingTimeInterval(8 * 60 * 60),
//    job: "Dispatcher"
//)
//
//debugPrintShift(validShift)
//
//// MARK: - Invalid Shift - Reveresed Times
//
//let reversedShift = Shift(
//    start: now,
//    end: now.addingTimeInterval(-2 * 60 * 60),
//    job: "Dispatcher"
//)
//
//debugPrintShift(reversedShift)

//// MARK: - Invalid Shift - Over 24 hours
//
//let longShift = Shift(
//    start: now,
//    end: now.addingTimeInterval(26 * 60 * 60),
//    job: "Dispatcher"
//)
//
//debugPrintShift(longShift)



func runShiftDebug() {
    let now = Date()
    
    let break1 = Break(
        startTime: now.addingTimeInterval(2 * 60 * 60),     // 2 hours in
        endTime:   now.addingTimeInterval(2 * 60 * 60 + 30 * 60), // 30 min long
        isPaid: false
    )
    
    let break2 = Break(
        startTime: now.addingTimeInterval(5 * 60 * 60),              // 5 hours in
        endTime:   now.addingTimeInterval(5 * 60 * 60 + 15 * 60),    // 15 min
        isPaid: true
    )

    let validShift = Shift(
        start: now,
        end: now.addingTimeInterval(26 * 60 * 60),
        breaks: [break1, break2],
        job: "Dispatcher"
    )

    debugPrintShift(validShift)
}


#if DEBUG
private var _didRunShiftDebug = false

/// Call from the app entry point (e.g., `TallyShiftApp.init()`) while debugging.
func runShiftDebugOnce() {
    guard !_didRunShiftDebug else { return }
    _didRunShiftDebug = true
    runShiftDebug()
}
#endif
