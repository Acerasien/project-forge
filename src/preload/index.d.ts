import { ElectronAPI } from '@electron-toolkit/preload'
import { IForgeAPI } from '../shared/types/ipc'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    forge: IForgeAPI
  }
}
