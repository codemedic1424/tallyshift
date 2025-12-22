//
//  AddShiftView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 12/22/25.
//

import SwiftUI

struct AddShiftView: View {
    @State var startTime: Date
    @State var endTime: Date
    @State var job: String = ""
    
    init() {
        let now = Date()
        _startTime = State(initialValue: now)
        _endTime = State(initialValue: now.addingTimeInterval(60))
    }
    
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var shiftStore: ShiftStore
    
    private var draftShift: Shift {
        Shift(
            start: startTime,
            end: endTime,
            breaks: [],
            job: job.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: nil
        )
    }
    
    var body: some View {
        //        HStack {
        //            Image(systemName: "plus")
        //                .foregroundStyle(.green)
        //            Text("Add A Shift")
        //            Spacer()
        //        }
        //        .font(.title2)
        //        .bold()
        //        .padding()
        
        Form {
            Section("Shift Info") {
                DatePicker("Shift Start", selection: $startTime)
                
                DatePicker("Shift End", selection: $endTime, in: startTime.addingTimeInterval(60)...)
                
                if let reason = draftShift.invalidReason {
                    Text(reason.description)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
            }
            Section("Job Info") {
                
                TextField("Job/Position", text: $job)
            }
        }
        .navigationTitle("+ Add a Shift")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    let newShift = draftShift
                    guard newShift.canBeSaved else { return }
                    
                    shiftStore.add(newShift)
                    dismiss()
                } label: {
                    Text("Save")
                }
                .disabled(!draftShift.canBeSaved)
            }
            
            ToolbarItem(placement: .topBarLeading) {
                Button(role: .cancel) {
                    dismiss()
                } label: {
                    Text("Cancel")
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        AddShiftView()
            .environmentObject(ShiftStore())
    }
}
