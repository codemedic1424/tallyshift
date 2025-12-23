//
//  ShiftDetailView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/22/25.
//

// TODO: - Change minutes to hours and minutes

import SwiftUI

struct ShiftDetailView: View {
    @Binding var shift: Shift
    @Environment(\.dismiss) private var dismiss
    
    @State private var draftShift: Shift
    
    @State private var isEditing = false
    
    init(shift: Binding<Shift>) {
        self._shift = shift
        self._draftShift = State(initialValue: shift.wrappedValue)
    }
    
    var body: some View {
        Form {
            Section("Job") {
                TextField("Job", text: $draftShift.job)
            }
            
            Section("Times") {
                DatePicker("Start", selection: $draftShift.start)
                DatePicker("End", selection: $draftShift.end)
                
                if let reason = draftShift.invalidReason {
                    Text(reason.description)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
            
            Section("Summary") {
                LabeledContent("Worked") {
                    Text("\(draftShift.workedMinutes) min")
                }
                LabeledContent("Unpaid breaks") {
                    Text("\(draftShift.unpaidBreakMinutes) min")
                }
            }
            
            Section("Breaks") {
                if draftShift.breaks.isEmpty {
                    Text("No breaks")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach($draftShift.breaks) { $oneBreak in
                        // For now, just display it. Next step: tap to edit in a BreakDetailView.
                        VStack(alignment: .leading) {
                            Text(oneBreak.isPaid ? "Paid break" : "Unpaid break")
                                .font(.headline)
                            Text("\(oneBreak.durationMinutes) min")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .onDelete { offsets in
                        guard isEditing else { return }
                        draftShift.breaks.remove(atOffsets: offsets)
                    }
                }
                
                if isEditing {
                    Button("Add break") {
                        let now = Date()
                        draftShift.breaks.insert(
                            Break(startTime: now, endTime: now.addingTimeInterval(15 * 60), isPaid: false),
                            at: 0
                        )
                    }
                }
            }
        }
        .disabled(!isEditing)
        .navigationTitle("Shift Details")
// TODO: - Add confirmation prompt on 'Cancel'.
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(role: .cancel) {
                    if isEditing {
                        draftShift = shift      // discard changes
                        isEditing = false
                    } else {
                        dismiss()
                    }
                } label: {
                    Text("Cancel")
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                if isEditing {
                    Button {
                        shift = draftShift
                        isEditing = false
                    } label: {
                        Text("Save")
                    }
                    .disabled(!draftShift.canBeSaved)
                } else {
                    Button {
                        draftShift = shift      // refresh draft from source of truth
                        isEditing = true
                    } label: {
                        Text("Edit")
                    }
                }
            }
        }
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
        ShiftDetailPreviewWrapper(initial: .sample())
    }
}

private struct ShiftDetailPreviewWrapper: View {
    @State var shift: Shift
    init(initial: Shift) { _shift = State(initialValue: initial) }
    
    var body: some View {
        ShiftDetailView(shift: $shift) // ✅ binding
    }
}
#Preview("Invalid Shift") {
    NavigationStack {
        ShiftDetailPreviewWrapper(initial: .invalidSample())
    }
}


