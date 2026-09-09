import { localStorageService } from './localStorageService'
import { supabaseService } from './supabaseService'

export const storage = supabaseService.configured ? supabaseService : localStorageService
export const storageMode = storage.mode
