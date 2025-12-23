//
//  ContentView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/23/25.
//

import SwiftUI

// MARK: - Shift Summary (read-only wiring)
struct ShiftSummaryView: View {
    @StateObject private var store = ShiftStore.sample()

    var body: some View {
        List {
            ForEach(store.shifts) { shift in
                Section(shift.job) {
                    LabeledContent("Duration (min)", value: "\(shift.shiftDurationMinutes)")
                    LabeledContent("Total breaks (min)", value: "\(shift.totalBreakMinutes)")
                    LabeledContent("Unpaid breaks (min)", value: "\(shift.unpaidBreakMinutes)")
                    LabeledContent("Paid breaks (min)", value: "\(shift.paidBreakMinutes)")
                    LabeledContent("Worked (min)", value: "\(shift.workedMinutes)")
                    LabeledContent("Paid hours", value: String(format: "%.2f", shift.paidHours))

                    LabeledContent("Valid", value: shift.isShiftValid ? "Yes" : "No")

                    if let reason = shift.invalidReason {
                        Text("Reason: \(reason.description)")
                            .font(.footnote)
                    }
                }
            }
        }
        .navigationTitle("Shift Summary")
    }
}

struct ContentView: View {
    @EnvironmentObject var auth: AuthViewModel
    @EnvironmentObject var store: ShiftStore
    
    var body: some View {
        Group {
            if auth.isAuthenticated {
                NavigationStack {
                    ShiftSummaryView()
                        .toolbar {
                            ToolbarItem(placement: .topBarTrailing) {
                                Button("Sign Out") {
                                    auth.isAuthenticated = false
                                }
                            }
                        }
                }
            } else {
                SignInView2()
            }
        }
        .animation(.default, value: auth.isAuthenticated)
    }
}

#Preview("Signed Out") {
    NavigationStack {
        ContentView()
            .environmentObject({
                let vm = AuthViewModel()
                vm.isAuthenticated = false
                return vm
            }())
            .environmentObject(ShiftStore.sample())
    }
}

#Preview("Signed In") {
    NavigationStack {
        ContentView()
            .environmentObject({
                let vm = AuthViewModel()
                vm.isAuthenticated = true
                return vm
            }())
            .environmentObject(ShiftStore.sample())
    }
}
