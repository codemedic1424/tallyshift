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

final class ShiftStore: ObservableObject {
    @Published var shifts: [Shift] = []
    
    // MARK: Functions
    func add(_ shift: Shift) {
        shifts.insert(shift, at: 0)
    }
    
    func delete( at offsets: IndexSet) {
        shifts.remove(atOffsets: offsets)
    }
}
