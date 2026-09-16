import React from 'react'
import {
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  Cpu,
  Network,
  Scale,
  Zap,
  Layers,
  Database,
  HardDrive,
  Radio,
  Activity,
  Archive,
  Lock,
  Bot,
  BarChart2,
  ShieldCheck,
  Search,
  Server,
  Sparkles,
  Boxes,
  LayoutGrid,
  Layout,
  Cog,
  Clock,
  Wifi,
  FileText,
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
    // Clients
    case 'web-client':
      return <Globe {...iconProps} />
    case 'mobile-client':
      return <Smartphone {...iconProps} />
    case 'desktop-client':
      return <Monitor {...iconProps} />
    case 'admin-dashboard':
      return <LayoutGrid {...iconProps} />
    case 'cli-tool':
      return <Terminal {...iconProps} />

    // Gateways
    case 'api-gateway':
      return <Network {...iconProps} />
    case 'load-balancer':
      return <Scale {...iconProps} />
    case 'cdn':
      return <Zap {...iconProps} />
    case 'reverse-proxy':
      return <Server {...iconProps} />
    case 'service-mesh':
      return <Layers {...iconProps} />

    // Compute
    case 'microservice':
      return <Cpu {...iconProps} />
    case 'bff-service':
      return <Layout {...iconProps} />
    case 'serverless':
      return <Zap {...iconProps} />
    case 'background-worker':
      return <Cog {...iconProps} />
    case 'cron-job':
      return <Clock {...iconProps} />
    case 'k8s-cluster':
      return <Layers {...iconProps} />
    case 'websocket-hub':
      return <Wifi {...iconProps} />
    case 'graphql-server':
      return <Boxes {...iconProps} />

    // Databases
    case 'postgres':
    case 'mongodb':
    case 'dynamodb':
    case 'cassandra':
      return <Database {...iconProps} />
    case 'vector-db':
      return <Sparkles {...iconProps} />
    case 'clickhouse':
      return <BarChart2 {...iconProps} />

    // Cache
    case 'redis-cache':
    case 'memcached':
      return <HardDrive {...iconProps} />
    case 'in-memory-cache':
      return <Cpu {...iconProps} />

    // Queue & Streaming
    case 'kafka':
      return <Activity {...iconProps} />
    case 'rabbitmq':
    case 'aws-sqs':
      return <Radio {...iconProps} />
    case 'nats':
      return <Zap {...iconProps} />

    // Storage
    case 's3-storage':
    case 'minio':
      return <Archive {...iconProps} />
    case 'efs-storage':
      return <HardDrive {...iconProps} />

    // AI
    case 'llm-server':
      return <Bot {...iconProps} />
    case 'rag-engine':
      return <Search {...iconProps} />
    case 'embedding-pipeline':
      return <Cpu {...iconProps} />
    case 'ai-agent':
      return <Sparkles {...iconProps} />

    // Security
    case 'auth-server':
      return <Lock {...iconProps} />
    case 'vault':
    case 'rate-limiter':
      return <ShieldCheck {...iconProps} />

    // Observability
    case 'prometheus':
      return <Activity {...iconProps} />
    case 'grafana':
      return <BarChart2 {...iconProps} />
    case 'loki-logs':
      return <FileText {...iconProps} />
    case 'opentelemetry':
      return <Network {...iconProps} />

    default:
      return <Boxes {...iconProps} />
  }
}
