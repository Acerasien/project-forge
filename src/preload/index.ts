import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IForgeAPI, GenerationSubscription } from '../shared/types/ipc'
import { v4 as uuidv4 } from 'uuid'
import type { GenerationRequest } from '../domain/ai/GenerationRequest'

// Custom APIs for renderer
const api = {}

const forgeAPI: IForgeAPI = {
  initiatives: {
    create: (name: string) => ipcRenderer.invoke('initiatives:create', name),
    get: (id: string) => ipcRenderer.invoke('initiatives:get', id),
    list: () => ipcRenderer.invoke('initiatives:list'),
    rename: (id: string, newName: string) => ipcRenderer.invoke('initiatives:rename', id, newName),
    delete: (id: string) => ipcRenderer.invoke('initiatives:delete', id)
  },
  ai: {
    createConversation: (initiativeId: string, title?: string) =>
      ipcRenderer.invoke('ai:createConversation', initiativeId, title),
    listConversations: (initiativeId: string) =>
      ipcRenderer.invoke('ai:listConversations', initiativeId),
    loadConversation: (id: string) => ipcRenderer.invoke('ai:loadConversation', id),
    generate: (request: GenerationRequest): GenerationSubscription => {
      const id = uuidv4()
      ipcRenderer.invoke('ai:generate', id, request)

      let onChunkCallback: ((text: string) => void) | undefined
      let onCompleteCallback: (() => void) | undefined
      let onErrorCallback: ((error: string) => void) | undefined

      const chunkHandler = (_event: unknown, text: string): void => {
        onChunkCallback?.(text)
      }
      const endHandler = (): void => {
        onCompleteCallback?.()
        cleanup()
      }
      const errorHandler = (_event: unknown, error: string): void => {
        onErrorCallback?.(error)
        cleanup()
      }

      const cleanup = (): void => {
        ipcRenderer.removeListener(`ai:stream:chunk:${id}`, chunkHandler)
        ipcRenderer.removeListener(`ai:stream:end:${id}`, endHandler)
        ipcRenderer.removeListener(`ai:stream:error:${id}`, errorHandler)
      }

      ipcRenderer.on(`ai:stream:chunk:${id}`, chunkHandler)
      ipcRenderer.on(`ai:stream:end:${id}`, endHandler)
      ipcRenderer.on(`ai:stream:error:${id}`, errorHandler)

      const subscription: GenerationSubscription = {
        onChunk: (cb: (text: string) => void) => {
          onChunkCallback = cb
          return subscription
        },
        onComplete: (cb: () => void) => {
          onCompleteCallback = cb
          return subscription
        },
        onError: (cb: (error: string) => void) => {
          onErrorCallback = cb
          return subscription
        },
        cancel: (): void => {
          ipcRenderer.invoke('ai:cancel', id)
          cleanup()
        }
      }

      return subscription
    }
  },
  system: {
    getStatus: () => ipcRenderer.invoke('system:getStatus'),
    revealDatabase: () => ipcRenderer.invoke('system:revealDatabase'),
    resetDatabase: () => ipcRenderer.invoke('system:resetDatabase')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('forge', forgeAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.forge = forgeAPI
}
