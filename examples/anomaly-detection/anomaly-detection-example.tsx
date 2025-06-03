import React from 'react'
import { create } from 'zustand'
import { zusound } from '../../packages'
import { CodeViewer } from '../code-viewer'
import anomalyDetectionSource from './anomaly-detection-example.tsx?raw'

// --- Zustand Store with Anomaly Detection ---

interface AnomalyDemoState {
    counter: number
    rapidCounter: number
    userProfile: { name: string; status: string }
    increment: () => void
    rapidIncrement: () => void
    updateProfile: (name: string) => void
}

const useAnomalyStore = create<AnomalyDemoState>(
    zusound(
        set => ({
            counter: 0,
            rapidCounter: 0,
            userProfile: { name: 'John', status: 'active' },
            increment: () => set(state => ({ counter: state.counter + 1 })),
            rapidIncrement: () => set(state => ({ rapidCounter: state.rapidCounter + 1 })),
            updateProfile: (name: string) => set(state => ({
                userProfile: { ...state.userProfile, name }
            })),
        }),
        {
            anomalyDetection: {
                rapidChange: {
                    count: 5,
                    windowMs: 1000,
                    alertSound: { magnitude: 0.8, frequency: 1200 },
                }
            },
            watchPaths: [
                { path: 'userProfile', alertLevel: 'critical' }
            ]
        }
    )
)

// --- React Component ---

function AnomalyDetectionExample() {
    const { counter, rapidCounter, userProfile, increment, rapidIncrement, updateProfile } = useAnomalyStore()

    // Setup anomaly event listener
    React.useEffect(() => {
        const handleAnomaly = (event: CustomEvent) => {
            const { chunk } = event.detail
            console.warn('🚨 ANOMALY DETECTED:', {
                type: chunk.type,
                path: chunk.path,
                changeCount: chunk.changeCount,
                severity: chunk.severity,
                timeWindow: `${chunk.windowMs}ms`
            })
        }

        window.addEventListener('__ZUSOUND_ANOMALY_CHUNK__', handleAnomaly as EventListener)
        return () => window.removeEventListener('__ZUSOUND_ANOMALY_CHUNK__', handleAnomaly as EventListener)
    }, [])

    const triggerNormalUsage = () => {
        console.log('Normal usage triggered')
        increment()
        increment()
    }

    const triggerRapidAnomaly = () => {
        console.log('Triggering rapid counter anomaly...')
        // Rapid fire updates - will trigger anomaly after 5th change within 1 second
        for (let i = 0; i < 8; i++) {
            setTimeout(() => rapidIncrement(), i * 50) // 50ms intervals = very rapid
        }
    }

    const triggerProfileAnomaly = () => {
        console.log('Triggering profile update anomaly...')
        // Rapid profile updates
        for (let i = 0; i < 6; i++) {
            setTimeout(() => updateProfile(`User${i}`), i * 100)
        }
    }

    return (
        <div>
            <h1>State Anomaly Detection Demo</h1>
            <p className="text-gray-600 mb-6">
                This example demonstrates ZuSound's ability to detect rapid, repetitive state changes that
                might indicate issues like infinite loops or inefficient updates. The anomaly detection
                engine automatically monitors state patterns and triggers distinct audio alerts when
                suspicious activity is detected. Check your browser console for anomaly logs.
            </p>

            {/* Current State Display */}
            <section className="card mb-6">
                <div className="card-body">
                    <h2 className="card-title">Current State Values</h2>
                    <p className="card-description">
                        Live view of the current state values. Watch these change as you interact with the controls below.
                    </p>
                    <div className="mb-4 space-y-1">
                        <p>Normal Counter: <strong className="font-semibold">{counter}</strong></p>
                        <p>Rapid Counter: <strong className="font-semibold">{rapidCounter}</strong></p>
                        <p>User Profile: <strong className="font-semibold">{userProfile.name} ({userProfile.status})</strong></p>
                    </div>
                </div>
            </section>

            {/* Normal Usage Controls */}
            <section className="card mb-6">
                <div className="card-body">
                    <h2 className="card-title">Normal Usage</h2>
                    <p className="card-description">
                        Regular state updates that won't trigger anomaly detection. These changes happen at normal intervals.
                    </p>
                    <button onClick={triggerNormalUsage} className="btn btn-primary">
                        Trigger Normal Updates
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        This updates the counter twice with normal timing - no anomaly will be detected.
                    </p>
                </div>
            </section>

            {/* Anomaly Triggers */}
            <section className="card mb-6">
                <div className="card-body">
                    <h2 className="card-title">Anomaly Detection Triggers</h2>
                    <p className="card-description">
                        These buttons will trigger rapid state changes designed to activate the anomaly detection system.
                        Listen for distinct warning sounds and check the console for anomaly events.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={triggerRapidAnomaly} className="btn btn-warning">
                            Trigger Rapid Counter Anomaly
                        </button>
                        <button onClick={triggerProfileAnomaly} className="btn btn-error">
                            Trigger Profile Update Anomaly
                        </button>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Anomaly Threshold:</strong> More than 5 changes within 1000ms triggers detection.
                            The rapid counter button will fire 8 updates at 50ms intervals, and the profile button
                            will fire 6 updates at 100ms intervals - both exceeding the threshold.
                        </p>
                    </div>
                </div>
            </section>

            {/* Configuration Info */}
            <section className="card mb-6">
                <div className="card-body">
                    <h2 className="card-title">Anomaly Detection Configuration</h2>
                    <p className="card-description">
                        Current configuration for this example's anomaly detection system.
                    </p>
                    <div className="bg-gray-50 p-4 rounded font-mono text-sm">
                        <p><strong>Threshold:</strong> 5 changes within 1000ms</p>
                        <p><strong>Alert Sound:</strong> 1200Hz frequency, 0.8 magnitude</p>
                        <p><strong>Watched Paths:</strong> userProfile (critical level)</p>
                        <p><strong>Event Name:</strong> __ZUSOUND_ANOMALY_CHUNK__</p>
                    </div>
                </div>
            </section>

            {/* Source Code Viewer */}
            <CodeViewer
                code={anomalyDetectionSource}
                language="tsx"
                title="View AnomalyDetectionExample.tsx Source"
            />
        </div>
    )
}

export default AnomalyDetectionExample 