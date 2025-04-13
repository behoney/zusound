import React, { useEffect, useRef } from 'react'
import { initializeVisualizer } from './index'

interface VisualizerProps {
  /**
   * Custom container class name
   */
  className?: string
  /**
   * Style object for the container
   */
  style?: React.CSSProperties
  /**
   * Position of the visualizer
   * @default 'top-right'
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
}

/**
 * React component wrapper for the Zusound visualizer
 *
 * This component renders a WebGL-based visualizer that automatically responds to
 * sonification events through a custom 'zusound' event without direct coupling
 * to the sonification system.
 */
export const Visualizer: React.FC<VisualizerProps> = ({
  className,
  style,
  position = 'top-right',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Get position styles based on the position prop
  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'top-right':
        return { top: '16px', right: '16px' }
      case 'top-left':
        return { top: '16px', left: '16px' }
      case 'bottom-right':
        return { bottom: '16px', right: '16px' }
      case 'bottom-left':
        return { bottom: '16px', left: '16px' }
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
      default:
        return { top: '16px', right: '16px' }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize the visualizer
    // The visualizer will listen for 'zusound' custom events on the window
    const unmount = initializeVisualizer(containerRef.current)

    // Clean up on component unmount
    return unmount
  }, [])

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    // Container should be exactly the size of the visualizer canvas
    width: '64px',
    height: '64px',
    // Apply position styles
    ...getPositionStyles(),
    // Apply any custom styles
    ...style,
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyles}
      aria-label="Zusound audio visualizer"
    />
  )
}

export default Visualizer
