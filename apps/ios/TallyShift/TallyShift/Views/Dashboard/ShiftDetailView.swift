//
//  ShiftDetailView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/22/25.
//

// TODO: - Change minutes to hours and minutes

import SwiftUI

struct ShiftDetailView: View {
    let shift: Shift
    
    var body: some View {
        List {
            Section("Summary") {
                LabeledContent("Job", value: shift.job)
                LabeledContent("Duration (min)", value: "\(shift.shiftDurationMinutes)")
                LabeledContent("Worked (min)", value: "\(shift.workedMinutes)")
                LabeledContent("Paid Hours", value: String(format: "%.2f", shift.paidHours))
            }
            Section("Breaks") {
                LabeledContent("Total (min)", value: "\(shift.totalBreakMinutes)")
                LabeledContent("Paid (min)", value: "\(shift.paidBreakMinutes)")
                LabeledContent("Unpaid (min)", value: "\(shift.unpaidBreakMinutes)")
            }
            Section("Validation") {
                LabeledContent("Valid", value: shift.isShiftValid ? "Yes" : "No")
                if let reason = shift.invalidReason {
                    Text(reason.description)
                       // .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Shift")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Sample data for #Preview

extension Shift {
    static func sample() -> Shift {
        let now = Date()
        
        let start = Calendar.current.date(
            byAdding: .hour,
            value: -8,
            to: now
        )!
        
        let end = now
        
        let unpaidBreak = Break(
            startTime: Calendar.current.date(byAdding: .minute, value: -60, to: end)!,
            endTime: Calendar.current.date(byAdding: .minute, value: -30, to: end)!,
            isPaid: false
        )
        
        let paidBreak = Break(
            startTime: Calendar.current.date(byAdding: .minute, value: -120, to: end)!,
            endTime: Calendar.current.date(byAdding: .minute, value: -110, to: end)!,
            isPaid: true
        )
        
        return Shift(
            start: start,
            end: end,
            breaks: [paidBreak, unpaidBreak],
            job: "HHIFR"
        )
    }
}

extension Shift {
    static func invalidSample() -> Shift {
        let now = Date()
        return Shift(
            start: now,
            end: now.addingTimeInterval(-300), // end before start
            breaks: [],
            job: "HHIFR"
        )
    }
}
// MARK: - End Preview Data

#Preview("Valid Shift") {
    NavigationStack {
        ShiftDetailView(shift: .sample())
    }
}
#Preview("Invalid Shift") {
    NavigationStack {
        ShiftDetailView(shift: .invalidSample())
    }
}
