import React from 'react'
import {
  Globe,
  Smartphone,
  Network,
  Scale,
  Zap,
  Cpu,
  Layers,
  Database,
  HardDrive,
  Radio,
  Activity,
  Archive,
  Lock,
  Boxes,
} from 'lucide-react'

interface Props {
  type: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const SystemComponentIcon: React.FC<Props> = ({ type, size = 18, className, style }) => {
  const iconProps = { size, className, style }

  switch (type) {
    case 'web-client':
      return <Globe {...iconProps} />
    case 'mobile-client':
      return <Smartphone {...iconProps} />
    case 'api-gateway':
      return <Network {...iconProps} />
    case 'load-balancer':
      return <Scale {...iconProps} />
    case 'cdn':
      return <Zap {...iconProps} />
    case 'microservice':
      return <Cpu {...iconProps} />
    case 'serverless':
      return <Zap {...iconProps} />
    case 'k8s-cluster':
      return <Layers {...iconProps} />
    case 'postgres':
      return <Database {...iconProps} />
    case 'mongodb':
      return <Database {...iconProps} />
    case 'redis-cache':
      return <HardDrive {...iconProps} />
    case 'rabbitmq':
      return <Radio {...iconProps} />
    case 'kafka':
      return <Activity {...iconProps} />
    case 's3-storage':
      return <Archive {...iconProps} />
    case 'auth-server':
      return <Lock {...iconProps} />
    default:
      return <Boxes {...iconProps} />
  }
}
