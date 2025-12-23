//
//  DashboardView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/26/25.
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var shiftStore: ShiftStore
    @State private var showingAddShift: Bool = false
    
    var body: some View {
        List {
            Section("Shifts") {
                if shiftStore.shifts.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No shifts yet")
                            .font(.headline)
                        Text("Tap \"+\" to add a shift.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                    .padding(.vertical, 20 )
                } else {
                    ForEach(shiftStore.shifts) { shift in
                        NavigationLink {
                            ShiftDetailView(shift: shift)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(shift.job)
                                    .font(.headline)

                                Text("\(shift.start.formatted(date: .abbreviated, time: .shortened)) → \(shift.end.formatted(date: .abbreviated, time: .shortened))")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)

                                Text("Worked: \(shift.workedMinutes) min")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .onDelete(perform: shiftStore.delete)
                }
            }
            Section("QA Modules") {
                NavigationLink("📊 Analytics", destination: AnalyticsView())
                NavigationLink("🧾 Reports", destination: ReportsView())
                NavigationLink("⚙️ Settings", destination: SettingsView())
            }
        }
        .navigationTitle("Dashboard")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAddShift = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddShift) {
            NavigationStack {
                AddShiftView()
                    .environmentObject(shiftStore)
            }
        }
    }
}

#Preview {
    NavigationStack {
        DashboardView()
            .environmentObject(ShiftStore())
    }
}
