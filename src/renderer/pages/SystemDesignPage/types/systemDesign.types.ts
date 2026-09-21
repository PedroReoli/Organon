export type SystemComponentCategory =
  | 'client'
  | 'gateway'
  | 'compute'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'ai'
  | 'security'
  | 'observability'

export interface SystemComponentDefinition {
  type: string
  label: string
  category: SystemComponentCategory
  icon: string
  defaultPort?: number
  techStack?: string
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
  scale?: string
  sla?: string
  notes?: string
}

export type ConnectionProtocol =
  | 'HTTP/REST'
  | 'gRPC'
  | 'WebSocket'
  | 'GraphQL'
  | 'SQL'
  | 'Kafka Protocol'
  | 'AMQP'
  | 'TCP/UDP'
  | 'Vector Query'
  | 'Async Event'
  | 'mTLS'

export interface SystemEdge {
  id: string
  source: string
  target: string
  label?: string
  protocol?: ConnectionProtocol
  animated?: boolean
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

export const COMPONENT_CATEGORIES: { id: SystemComponentCategory; label: string; color: string }[] = [
  { id: 'client', label: 'Frontend & Clientes', color: '#38bdf8' },
  { id: 'gateway', label: 'Gateways & Roteamento', color: '#f59e0b' },
  { id: 'compute', label: 'Compute & Serviços', color: '#6366f1' },
  { id: 'database', label: 'Bancos de Dados', color: '#10b981' },
  { id: 'cache', label: 'Cache & Memória', color: '#ec4899' },
  { id: 'queue', label: 'Filas & Streaming', color: '#f97316' },
  { id: 'storage', label: 'Storage & Arquivos', color: '#06b6d4' },
  { id: 'ai', label: 'AI & LLM Infra', color: '#8b5cf6' },
  { id: 'security', label: 'Segurança & Auth', color: '#ef4444' },
  { id: 'observability', label: 'Observabilidade', color: '#14b8a6' },
]

export const COMPONENT_PALETTE: SystemComponentDefinition[] = [
  // Clientes
  { type: 'web-client', label: 'Web Frontend', category: 'client', icon: 'Globe', techStack: 'React / Next.js', description: 'Aplicação web SPA / SSR' },
  { type: 'mobile-client', label: 'App Mobile', category: 'client', icon: 'Smartphone', techStack: 'React Native / Expo', description: 'App iOS e Android' },
  { type: 'desktop-client', label: 'Desktop App', category: 'client', icon: 'Monitor', techStack: 'Electron / Tauri', description: 'Cliente desktop multiplataforma' },
  { type: 'admin-dashboard', label: 'Painel Admin', category: 'client', icon: 'LayoutGrid', techStack: 'Vite / Tailwind', description: 'Backoffice administrativo' },
  { type: 'cli-tool', label: 'CLI / Terminal', category: 'client', icon: 'Terminal', techStack: 'Node / Go CLI', description: 'Ferramenta de linha de comando' },

  // Gateways & Edge
  { type: 'api-gateway', label: 'API Gateway', category: 'gateway', icon: 'Network', defaultPort: 8080, techStack: 'Kong / KrakenD', description: 'Roteamento, auth e rate limit unificados' },
  { type: 'load-balancer', label: 'Load Balancer', category: 'gateway', icon: 'Scale', defaultPort: 80, techStack: 'Nginx / AWS ALB', description: 'Balanceamento de carga L4 / L7' },
  { type: 'cdn', label: 'CDN Edge', category: 'gateway', icon: 'Zap', techStack: 'Cloudflare / CloudFront', description: 'Distribuição global de assets e caching estático' },
  { type: 'reverse-proxy', label: 'Reverse Proxy', category: 'gateway', icon: 'Server', defaultPort: 443, techStack: 'HAProxy / Traefik', description: 'Terminação TLS e proxy reverso' },
  { type: 'service-mesh', label: 'Service Mesh / Envoy', category: 'gateway', icon: 'Layers', techStack: 'Istio / Envoy', description: 'Comunicação mTLS e telemetria inter-serviços' },

  // Compute & Serviços
  { type: 'microservice', label: 'Microserviço Backend', category: 'compute', icon: 'Cpu', defaultPort: 3000, techStack: 'Node.js / Go / FastAPI', description: 'Serviço de domínio com API REST / gRPC' },
  { type: 'bff-service', label: 'BFF (Backend-for-Frontend)', category: 'compute', icon: 'Layout', defaultPort: 4000, techStack: 'Node.js / GraphQL', description: 'Camada de agregação sob medida para frontends' },
  { type: 'serverless', label: 'Serverless Lambda', category: 'compute', icon: 'Zap', techStack: 'AWS Lambda / Workers', description: 'Funções stateless orientadas a eventos' },
  { type: 'background-worker', label: 'Worker / Consumer', category: 'compute', icon: 'Cog', techStack: 'Go / Python Celery', description: 'Processamento assíncrono de jobs e filas' },
  { type: 'cron-job', label: 'Cron / Scheduled Job', category: 'compute', icon: 'Clock', techStack: 'K8s CronJob / BullMQ', description: 'Tarefas agendadas periódicas' },
  { type: 'k8s-cluster', label: 'Kubernetes Cluster', category: 'compute', icon: 'Layers', techStack: 'EKS / GKE / K8s', description: 'Orquestração de pods e containers' },
  { type: 'websocket-hub', label: 'WebSocket Server', category: 'compute', icon: 'Wifi', defaultPort: 8081, techStack: 'Socket.io / ws Go', description: 'Conexões bidirecionais em tempo real' },
  { type: 'graphql-server', label: 'GraphQL API', category: 'compute', icon: 'Boxes', defaultPort: 4000, techStack: 'Apollo Server / Yoga', description: 'API com consultas e mutations tipadas' },

  // Bancos de Dados
  { type: 'postgres', label: 'PostgreSQL Relacional', category: 'database', icon: 'Database', defaultPort: 5432, techStack: 'PostgreSQL 16', description: 'Banco ACID transacional com suporte a JSON e índices' },
  { type: 'mongodb', label: 'MongoDB NoSQL', category: 'database', icon: 'Database', defaultPort: 27017, techStack: 'MongoDB Atlas', description: 'Banco de documentos escalável horizontalmente' },
  { type: 'dynamodb', label: 'DynamoDB Key-Value', category: 'database', icon: 'Database', techStack: 'AWS DynamoDB', description: 'Banco NoSQL serverless de latência sub-10ms' },
  { type: 'cassandra', label: 'Cassandra / ScyllaDB', category: 'database', icon: 'Database', defaultPort: 9042, techStack: 'ScyllaDB / Cassandra', description: 'Banco colunar distribuído de altíssima taxa de escrita' },
  { type: 'vector-db', label: 'Vector DB (RAG)', category: 'database', icon: 'Sparkles', defaultPort: 6333, techStack: 'Qdrant / Pinecone / pgvector', description: 'Busca semântica vetorial para IA e embeddings' },
  { type: 'clickhouse', label: 'ClickHouse OLAP', category: 'database', icon: 'BarChart2', defaultPort: 8123, techStack: 'ClickHouse Columnar', description: 'Analytics em tempo real e processamento analítico' },

  // Cache & In-Memory
  { type: 'redis-cache', label: 'Redis Cache', category: 'cache', icon: 'HardDrive', defaultPort: 6379, techStack: 'Redis 7 Cluster', description: 'Cache em memória, TTL, sessões e locks distribuídos' },
  { type: 'memcached', label: 'Memcached', category: 'cache', icon: 'HardDrive', defaultPort: 11211, techStack: 'Memcached', description: 'Cache de objetos chave-valor simples e rápido' },
  { type: 'in-memory-cache', label: 'Local In-Memory Cache', category: 'cache', icon: 'Cpu', techStack: 'LRU Cache / BigCache', description: 'Cache no processo de altíssima velocidade' },

  // Filas & Streaming
  { type: 'kafka', label: 'Kafka Event Bus', category: 'queue', icon: 'Activity', defaultPort: 9092, techStack: 'Apache Kafka / Redpanda', description: 'Stream de eventos distribuído de alta throughput' },
  { type: 'rabbitmq', label: 'RabbitMQ Queue', category: 'queue', icon: 'Radio', defaultPort: 5672, techStack: 'RabbitMQ AMQP', description: 'Fila de mensagens com roteamento flexível' },
  { type: 'aws-sqs', label: 'AWS SQS / SNS', category: 'queue', icon: 'Radio', techStack: 'AWS SQS / SNS', description: 'Fila de mensagens gerenciada e tópicos Pub/Sub' },
  { type: 'nats', label: 'NATS Messaging', category: 'queue', icon: 'Zap', defaultPort: 4222, techStack: 'NATS JetStream', description: 'Mensageria ultrarrápida para microserviços' },

  // Storage
  { type: 's3-storage', label: 'S3 Object Storage', category: 'storage', icon: 'Archive', techStack: 'AWS S3 / Cloudflare R2', description: 'Armazenamento de imagens, vídeos e backups' },
  { type: 'minio', label: 'MinIO Self-Hosted', category: 'storage', icon: 'Archive', defaultPort: 9000, techStack: 'MinIO S3 Compatible', description: 'Object storage local compatível com API S3' },
  { type: 'efs-storage', label: 'EFS / Volume NFS', category: 'storage', icon: 'HardDrive', techStack: 'AWS EFS / NFS', description: 'Sistema de arquivos compartilhado persistente' },

  // AI & LLM Infra
  { type: 'llm-server', label: 'LLM Inference Server', category: 'ai', icon: 'Bot', defaultPort: 8000, techStack: 'vLLM / Ollama / OpenAI', description: 'Servidor de inferência de modelos de linguagem' },
  { type: 'rag-engine', label: 'RAG Retrieval Engine', category: 'ai', icon: 'Search', techStack: 'LangChain / LlamaIndex', description: 'Orquestrador de busca contextual e chunks' },
  { type: 'embedding-pipeline', label: 'Embedding Worker', category: 'ai', icon: 'Cpu', techStack: 'OpenAI Embeddings / BGE', description: 'Geração e indexação de vetores em lote' },
  { type: 'ai-agent', label: 'AI Agent Orchestrator', category: 'ai', icon: 'Sparkles', techStack: 'LangGraph / AutoGen', description: 'Agentes autônomos com chamada de ferramentas' },

  // Segurança & Auth
  { type: 'auth-server', label: 'Auth / OAuth Server', category: 'security', icon: 'Lock', defaultPort: 4000, techStack: 'Keycloak / Auth0 / NextAuth', description: 'Provedor de identidade, JWT e SSO' },
  { type: 'vault', label: 'Secrets Vault', category: 'security', icon: 'ShieldCheck', defaultPort: 8200, techStack: 'HashiCorp Vault / AWS KMS', description: 'Gerenciamento seguro de credenciais e chaves' },
  { type: 'rate-limiter', label: 'Rate Limiter', category: 'security', icon: 'ShieldCheck', techStack: 'Redis Token Bucket', description: 'Proteção contra abuso e mitigação de DDoS' },

  // Observabilidade
  { type: 'prometheus', label: 'Prometheus Metrics', category: 'observability', icon: 'Activity', defaultPort: 9090, techStack: 'Prometheus TSDB', description: 'Coleta de métricas e séries temporais' },
  { type: 'grafana', label: 'Grafana Dashboard', category: 'observability', icon: 'BarChart2', defaultPort: 3001, techStack: 'Grafana Labs', description: 'Visualização de métricas e painéis operacionais' },
  { type: 'loki-logs', label: 'Loki / ELK Logs', category: 'observability', icon: 'FileText', defaultPort: 3100, techStack: 'Grafana Loki / Elastic', description: 'Agregação e busca centralizada de logs' },
  { type: 'opentelemetry', label: 'OpenTelemetry Tracing', category: 'observability', icon: 'Network', defaultPort: 4317, techStack: 'OTel Collector / Jaeger', description: 'Rastreamento distribuído de requisições ponta a ponta' },
]

export const BUILTIN_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'microservices-basic',
    name: 'Microserviços com Gateway, Cache & DB Relacional',
    description: 'Arquitetura clássica escalável com CDN Cloudflare, API Gateway, Microserviço Backend, Redis Cache e Banco de Dados PostgreSQL.',
    category: 'Microservices',
    nodes: [
      { id: 'node-1', type: 'web-client', label: 'Web App', category: 'client', icon: 'Globe', techStack: 'Next.js', x: 80, y: 160 },
      { id: 'node-2', type: 'cdn', label: 'CDN Cloudflare', category: 'gateway', icon: 'Zap', x: 260, y: 160 },
      { id: 'node-3', type: 'api-gateway', label: 'API Gateway', category: 'gateway', icon: 'Network', techStack: 'Kong', x: 440, y: 160, port: 8080 },
      { id: 'node-4', type: 'microservice', label: 'Core Backend', category: 'compute', icon: 'Cpu', techStack: 'Go / Node', x: 640, y: 160, port: 3000, scale: '3x Replicas' },
      { id: 'node-5', type: 'redis-cache', label: 'Redis Cache', category: 'cache', icon: 'HardDrive', techStack: 'Redis 7', x: 640, y: 320, port: 6379 },
      { id: 'node-6', type: 'postgres', label: 'PostgreSQL DB', category: 'database', icon: 'Database', techStack: 'Postgres 16', x: 860, y: 160, port: 5432 },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', label: 'HTTPS / WAF', protocol: 'HTTP/REST' },
      { id: 'edge-2', source: 'node-2', target: 'node-3', label: 'Proxy Ingress', protocol: 'HTTP/REST' },
      { id: 'edge-3', source: 'node-3', target: 'node-4', label: 'gRPC / JSON', protocol: 'gRPC' },
      { id: 'edge-4', source: 'node-4', target: 'node-5', label: 'Cache Lookup', protocol: 'TCP/UDP' },
      { id: 'edge-5', source: 'node-4', target: 'node-6', label: 'SQL Query', protocol: 'SQL' },
    ],
  },
  {
    id: 'event-driven',
    name: 'Arquitetura Event-Driven (Kafka + Workers + S3)',
    description: 'Pipeline desacoplado orientado a eventos com barramento Kafka, múltiplos consumers assíncronos, notificações e data lake S3.',
    category: 'Event-Driven',
    nodes: [
      { id: 'ev-1', type: 'web-client', label: 'Cliente Web', category: 'client', icon: 'Globe', x: 80, y: 200 },
      { id: 'ev-2', type: 'api-gateway', label: 'Ingress Gateway', category: 'gateway', icon: 'Network', x: 260, y: 200, port: 8080 },
      { id: 'ev-3', type: 'kafka', label: 'Kafka Event Bus', category: 'queue', icon: 'Activity', techStack: 'Kafka 3.6', x: 480, y: 200, port: 9092 },
      { id: 'ev-4', type: 'background-worker', label: 'Notification Worker', category: 'compute', icon: 'Cog', techStack: 'Node.js', x: 700, y: 100 },
      { id: 'ev-5', type: 'background-worker', label: 'Analytics Worker', category: 'compute', icon: 'Cog', techStack: 'Python', x: 700, y: 280 },
      { id: 'ev-6', type: 's3-storage', label: 'S3 Data Lake', category: 'storage', icon: 'Archive', x: 920, y: 280 },
    ],
    edges: [
      { id: 'edge-ev-1', source: 'ev-1', target: 'ev-2', label: 'REST API', protocol: 'HTTP/REST' },
      { id: 'edge-ev-2', source: 'ev-2', target: 'ev-3', label: 'Publish Event', protocol: 'Kafka Protocol', animated: true },
      { id: 'edge-ev-3', source: 'ev-3', target: 'ev-4', label: 'Consume Orders', protocol: 'Kafka Protocol', animated: true },
      { id: 'edge-ev-4', source: 'ev-3', target: 'ev-5', label: 'Consume Clicks', protocol: 'Kafka Protocol', animated: true },
      { id: 'edge-ev-5', source: 'ev-5', target: 'ev-6', label: 'Store Parquet', protocol: 'TCP/UDP' },
    ],
  },
  {
    id: 'rag-ai-pipeline',
    name: 'RAG & AI Agent Pipeline (LLM + Vector DB + Cache)',
    description: 'Arquitetura moderna de inteligência artificial generativa com RAG vetorial, cache semântico Redis e inferência LLM.',
    category: 'AI & Machine Learning',
    nodes: [
      { id: 'ai-1', type: 'web-client', label: 'Chat Interface', category: 'client', icon: 'Globe', x: 80, y: 180 },
      { id: 'ai-2', type: 'api-gateway', label: 'Gateway & Auth', category: 'gateway', icon: 'Network', x: 260, y: 180, port: 8080 },
      { id: 'ai-3', type: 'ai-agent', label: 'Agent Orchestrator', category: 'ai', icon: 'Sparkles', techStack: 'LangGraph', x: 460, y: 180 },
      { id: 'ai-4', type: 'redis-cache', label: 'Semantic Cache', category: 'cache', icon: 'HardDrive', techStack: 'Redis Vector', x: 460, y: 340, port: 6379 },
      { id: 'ai-5', type: 'vector-db', label: 'Vector DB (Qdrant)', category: 'database', icon: 'Sparkles', techStack: 'Qdrant', x: 700, y: 100, port: 6333 },
      { id: 'ai-6', type: 'llm-server', label: 'LLM Inference', category: 'ai', icon: 'Bot', techStack: 'vLLM / Ollama', x: 700, y: 260, port: 8000 },
    ],
    edges: [
      { id: 'edge-ai-1', source: 'ai-1', target: 'ai-2', label: 'Stream SSE / WS', protocol: 'WebSocket' },
      { id: 'edge-ai-2', source: 'ai-2', target: 'ai-3', label: 'User Query', protocol: 'HTTP/REST' },
      { id: 'edge-ai-3', source: 'ai-3', target: 'ai-4', label: 'Cache Hit Check', protocol: 'TCP/UDP' },
      { id: 'edge-ai-4', source: 'ai-3', target: 'ai-5', label: 'Top-K Vector Search', protocol: 'Vector Query' },
      { id: 'edge-ai-5', source: 'ai-3', target: 'ai-6', label: 'Prompt + Context', protocol: 'HTTP/REST', animated: true },
    ],
  },
  {
    id: 'realtime-chat',
    name: 'Chat em Tempo Real & Colaboração (WebSockets + Redis PubSub)',
    description: 'Sistema escalável horizontalmente com WebSocket Hubs, cluster Redis Pub/Sub para broadcast de salas e Cassandra para histórico.',
    category: 'Realtime',
    nodes: [
      { id: 'rt-1', type: 'mobile-client', label: 'App Mobile', category: 'client', icon: 'Smartphone', x: 80, y: 120 },
      { id: 'rt-2', type: 'web-client', label: 'Web Client', category: 'client', icon: 'Globe', x: 80, y: 260 },
      { id: 'rt-3', type: 'load-balancer', label: 'NLB / Proxy', category: 'gateway', icon: 'Scale', x: 260, y: 190, port: 443 },
      { id: 'rt-4', type: 'websocket-hub', label: 'WS Hub Pods', category: 'compute', icon: 'Wifi', techStack: 'Go ws', x: 460, y: 190, port: 8081, scale: 'Auto-scale' },
      { id: 'rt-5', type: 'redis-cache', label: 'Redis Pub/Sub', category: 'cache', icon: 'HardDrive', techStack: 'Redis Cluster', x: 680, y: 100, port: 6379 },
      { id: 'rt-6', type: 'cassandra', label: 'Message Store', category: 'database', icon: 'Database', techStack: 'ScyllaDB', x: 680, y: 280, port: 9042 },
    ],
    edges: [
      { id: 'edge-rt-1', source: 'rt-1', target: 'rt-3', label: 'WSS Connect', protocol: 'WebSocket' },
      { id: 'edge-rt-2', source: 'rt-2', target: 'rt-3', label: 'WSS Connect', protocol: 'WebSocket' },
      { id: 'edge-rt-3', source: 'rt-3', target: 'rt-4', label: 'Sticky Session', protocol: 'TCP/UDP' },
      { id: 'edge-rt-4', source: 'rt-4', target: 'rt-5', label: 'Publish / Subscribe', protocol: 'Async Event', animated: true },
      { id: 'edge-rt-5', source: 'rt-4', target: 'rt-6', label: 'Persist History', protocol: 'TCP/UDP' },
    ],
  },
  {
    id: 'ecommerce-scale',
    name: 'E-commerce de Alta Escala (Checkout, Pagamentos & Filas)',
    description: 'Arquitetura resiliente para milhares de compras simultâneas com fila de pagamentos RabbitMQ e banco com Read Replicas.',
    category: 'E-Commerce',
    nodes: [
      { id: 'ec-1', type: 'web-client', label: 'Storefront Web', category: 'client', icon: 'Globe', x: 80, y: 180 },
      { id: 'ec-2', type: 'api-gateway', label: 'Gateway & RateLimit', category: 'gateway', icon: 'Network', x: 260, y: 180, port: 8080 },
      { id: 'ec-3', type: 'microservice', label: 'Order Service', category: 'compute', icon: 'Cpu', techStack: 'Node.js', x: 480, y: 120, port: 3001 },
      { id: 'ec-4', type: 'rabbitmq', label: 'Payment Queue', category: 'queue', icon: 'Radio', techStack: 'RabbitMQ', x: 700, y: 120, port: 5672 },
      { id: 'ec-5', type: 'background-worker', label: 'Payment Worker', category: 'compute', icon: 'Cog', techStack: 'Go Worker', x: 920, y: 120 },
      { id: 'ec-6', type: 'postgres', label: 'PostgreSQL Primary', category: 'database', icon: 'Database', x: 480, y: 280, port: 5432 },
      { id: 'ec-7', type: 'redis-cache', label: 'Product Catalog Cache', category: 'cache', icon: 'HardDrive', x: 260, y: 340, port: 6379 },
    ],
    edges: [
      { id: 'edge-ec-1', source: 'ec-1', target: 'ec-2', label: 'HTTPS', protocol: 'HTTP/REST' },
      { id: 'edge-ec-2', source: 'ec-2', target: 'ec-7', label: 'Catalog Lookup', protocol: 'TCP/UDP' },
      { id: 'edge-ec-3', source: 'ec-2', target: 'ec-3', label: 'Create Order', protocol: 'gRPC' },
      { id: 'edge-ec-4', source: 'ec-3', target: 'ec-6', label: 'Write Order', protocol: 'SQL' },
      { id: 'edge-ec-5', source: 'ec-3', target: 'ec-4', label: 'Enqueue Payment', protocol: 'AMQP', animated: true },
      { id: 'edge-ec-6', source: 'ec-4', target: 'ec-5', label: 'Process Charge', protocol: 'AMQP', animated: true },
    ],
  },
]

export interface SavedSystemDesign {
  id: string
  name: string
  description?: string
  color: string // Hex color string
  tags: string[]
  nodes: SystemNode[]
  edges: SystemEdge[]
  createdAt: string
  updatedAt: string
  isTemplate?: boolean
}

export interface SystemDesignColorOption {
  id: string
  name: string
  color: string
}

export const SYSTEM_DESIGN_COLORS: SystemDesignColorOption[] = [
  { id: 'indigo', name: 'Índigo', color: '#6366f1' },
  { id: 'emerald', name: 'Esmeralda', color: '#10b981' },
  { id: 'amber', name: 'Âmbar', color: '#f59e0b' },
  { id: 'rose', name: 'Rosa Coral', color: '#f43f5e' },
  { id: 'cyan', name: 'Ciano', color: '#06b6d4' },
  { id: 'purple', name: 'Púrpura', color: '#a855f7' },
  { id: 'orange', name: 'Laranja', color: '#f97316' },
  { id: 'blue', name: 'Azul Real', color: '#3b82f6' },
]
