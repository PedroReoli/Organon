export type SystemComponentCategory =
  | 'client'
  | 'gateway'
  | 'compute'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'security'

export interface SystemComponentDefinition {
  type: string
  label: string
  category: SystemComponentCategory
  icon: string
  defaultPort?: number
  description: string
}

export interface SystemNode {
  id: string
  type: string
  label: string
  category: SystemComponentCategory
  icon: string
  x: number
  y: number
  description?: string
  port?: number
  techStack?: string
}

export type ConnectionProtocol = 'HTTP/REST' | 'gRPC' | 'WebSocket' | 'AMQP' | 'Kafka Protocol' | 'TCP/UDP' | 'SQL'

export interface SystemEdge {
  id: string
  source: string
  target: string
  label?: string
  protocol?: ConnectionProtocol
}

export interface ArchitectureTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: SystemNode[]
  edges: SystemEdge[]
}

export interface SystemDesignReviewResult {
  score: number // 0 a 100
  summary: string
  spofs: string[] // Single Points of Failure
  bottlenecks: string[]
  securityAlerts: string[]
  recommendations: string[]
}

export const COMPONENT_PALETTE: SystemComponentDefinition[] = [
  { type: 'web-client', label: 'Web Frontend', category: 'client', icon: '🌐', description: 'Aplicação web React/Vite' },
  { type: 'mobile-client', label: 'App Mobile', category: 'client', icon: '📱', description: 'App iOS/Android Expo' },
  { type: 'api-gateway', label: 'API Gateway', category: 'gateway', icon: '🚪', defaultPort: 8080, description: 'Roteamento e autorização de APIs' },
  { type: 'load-balancer', label: 'Load Balancer', category: 'gateway', icon: '⚖️', defaultPort: 80, description: 'Balanceamento de carga Nginx/HAProxy' },
  { type: 'cdn', label: 'CDN Edge', category: 'gateway', icon: '⚡', description: 'Distribuição estática de arquivos Cloudflare' },
  { type: 'microservice', label: 'Microserviço', category: 'compute', icon: '⚙️', defaultPort: 3000, description: 'Serviço Node.js / Go / Python' },
  { type: 'serverless', label: 'Lambda / Function', category: 'compute', icon: '⚡', description: 'Execução serverless orientada a eventos' },
  { type: 'k8s-cluster', label: 'Kubernetes Cluster', category: 'compute', icon: '☸️', description: 'Orquestração de containers K8s' },
  { type: 'postgres', label: 'PostgreSQL DB', category: 'database', icon: '🐘', defaultPort: 5432, description: 'Banco de dados relacional' },
  { type: 'mongodb', label: 'MongoDB NoSQL', category: 'database', icon: '🍃', defaultPort: 27017, description: 'Banco NoSQL orientado a documentos' },
  { type: 'redis-cache', label: 'Redis Cache', category: 'cache', icon: '⚡', defaultPort: 6379, description: 'Cache em memória e sessões' },
  { type: 'rabbitmq', label: 'RabbitMQ Queue', category: 'queue', icon: '🐇', defaultPort: 5672, description: 'Fila AMQP de mensagens' },
  { type: 'kafka', label: 'Kafka Event Bus', category: 'queue', icon: '📊', defaultPort: 9092, description: 'Stream de eventos distribuído' },
  { type: 's3-storage', label: 'S3 Object Storage', category: 'storage', icon: '🪣', description: 'Armazenamento de mídia e uploads' },
  { type: 'auth-server', label: 'Auth / OAuth Server', category: 'security', icon: '🔒', defaultPort: 4000, description: 'Servidor de autenticação JWT/Keycloak' },
]

export const BUILTIN_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'microservices-basic',
    name: 'Microserviços com Gateway & Cache',
    description: 'Arquitetura clássica com Nginx Load Balancer, API Gateway, Microserviço backend, Redis Cache e DB Relacional PostgreSQL.',
    category: 'Microservices',
    nodes: [
      { id: 'node-1', type: 'web-client', label: 'Web App', category: 'client', icon: '🌐', x: 100, y: 150 },
      { id: 'node-2', type: 'api-gateway', label: 'API Gateway', category: 'gateway', icon: '🚪', x: 300, y: 150, port: 8080 },
      { id: 'node-3', type: 'microservice', label: 'Core Service', category: 'compute', icon: '⚙️', x: 520, y: 150, port: 3000 },
      { id: 'node-4', type: 'redis-cache', label: 'Redis Cache', category: 'cache', icon: '⚡', x: 520, y: 320, port: 6379 },
      { id: 'node-5', type: 'postgres', label: 'PostgreSQL DB', category: 'database', icon: '🐘', x: 740, y: 150, port: 5432 },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', label: 'HTTPS', protocol: 'HTTP/REST' },
      { id: 'edge-2', source: 'node-2', target: 'node-3', label: 'gRPC/REST', protocol: 'gRPC' },
      { id: 'edge-3', source: 'node-3', target: 'node-4', label: 'Cache Lookup', protocol: 'TCP/UDP' },
      { id: 'edge-4', source: 'node-3', target: 'node-5', label: 'SQL Query', protocol: 'SQL' },
    ],
  },
  {
    id: 'event-driven',
    name: 'Arquitetura Event-Driven (Kafka + Workers)',
    description: 'Pipeline orientado a eventos desacoplado com produtores, barramento Kafka, Workers assíncronos e S3 Storage.',
    category: 'Event-Driven',
    nodes: [
      { id: 'ev-1', type: 'web-client', label: 'Cliente Web', category: 'client', icon: '🌐', x: 100, y: 180 },
      { id: 'ev-2', type: 'api-gateway', label: 'Ingress Gateway', category: 'gateway', icon: '🚪', x: 300, y: 180 },
      { id: 'ev-3', type: 'kafka', label: 'Kafka Event Bus', category: 'queue', icon: '📊', x: 520, y: 180, port: 9092 },
      { id: 'ev-4', type: 'microservice', label: 'Notification Worker', category: 'compute', icon: '⚙️', x: 740, y: 100 },
      { id: 'ev-5', type: 'microservice', label: 'Analytics Worker', category: 'compute', icon: '⚙️', x: 740, y: 260 },
      { id: 'ev-6', type: 's3-storage', label: 'S3 Data Lake', category: 'storage', icon: '🪣', x: 950, y: 260 },
    ],
    edges: [
      { id: 'edge-ev-1', source: 'ev-1', target: 'ev-2', label: 'REST API', protocol: 'HTTP/REST' },
      { id: 'edge-ev-2', source: 'ev-2', target: 'ev-3', label: 'Publish Event', protocol: 'Kafka Protocol' },
      { id: 'edge-ev-3', source: 'ev-3', target: 'ev-4', label: 'Consume Events', protocol: 'Kafka Protocol' },
      { id: 'edge-ev-4', source: 'ev-3', target: 'ev-5', label: 'Consume Events', protocol: 'Kafka Protocol' },
      { id: 'edge-ev-5', source: 'ev-5', target: 'ev-6', label: 'Store Raw Data', protocol: 'TCP/UDP' },
    ],
  },
]
