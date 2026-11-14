export type Unit = { id: string; name: string };
export type Resource = {
  id: string;
  name: string;
  by: string;
  kind: "course" | "book" | "video" | "project";
  url?: string;
  role: "study" | "daily";
  days: number[];      // 0=Sun ... 6=Sat
  minutes: number;
  units: Unit[];
};
export type Plan = {
  version: 1;
  resources: Resource[];
  english: { classDays: number[]; practiceMinutes: number; classMinutes: number };
};

export const DEFAULT_PLAN: Plan = {
  version: 1,
  resources: [
  {
    id: "nasser",
    name: "Backend Fundamentals",
    by: "Hussein Nasser · Udemy",
    kind: "course",
    url: "https://www.udemy.com/course/fundamentals-of-backend-communications-and-protocols/",
    role: "study",
    days: [
      6
    ],
    minutes: 60,
    units: [
      {
        id: "nasser-1",
        name: "Course intro & how backends communicate"
      },
      {
        id: "nasser-2",
        name: "Request–Response, sync vs async"
      },
      {
        id: "nasser-3",
        name: "Push, short polling & long polling"
      },
      {
        id: "nasser-4",
        name: "Server-Sent Events"
      },
      {
        id: "nasser-5",
        name: "Publish–Subscribe (RabbitMQ)"
      },
      {
        id: "nasser-6",
        name: "Multiplexing vs demultiplexing, connection pooling"
      },
      {
        id: "nasser-7",
        name: "Stateful vs stateless, sidecar pattern"
      },
      {
        id: "nasser-8",
        name: "Protocol properties & the OSI model"
      },
      {
        id: "nasser-9",
        name: "Internet Protocol & UDP"
      },
      {
        id: "nasser-10",
        name: "TCP"
      },
      {
        id: "nasser-11",
        name: "TLS"
      },
      {
        id: "nasser-12",
        name: "HTTP/1.1"
      },
      {
        id: "nasser-13",
        name: "WebSockets"
      },
      {
        id: "nasser-14",
        name: "HTTP/2"
      },
      {
        id: "nasser-15",
        name: "HTTP/3 & QUIC"
      },
      {
        id: "nasser-16",
        name: "gRPC"
      },
      {
        id: "nasser-17",
        name: "WebRTC"
      },
      {
        id: "nasser-18",
        name: "Many ways to HTTPS"
      },
      {
        id: "nasser-19",
        name: "Processes, threads & accepting connections"
      },
      {
        id: "nasser-20",
        name: "Reading/sending requests & Nagle's algorithm"
      },
      {
        id: "nasser-21",
        name: "Proxies & load balancers (L4 vs L7)"
      },
      {
        id: "nasser-22",
        name: "Security basics: JWT & OWASP"
      }
    ]
  },
  {
    id: "fastapi",
    name: "FastAPI & Backend Dev",
    by: "Ultimate Guide to FastAPI · Udemy",
    kind: "course",
    url: "https://www.udemy.com/course/fastapi-guide/",
    role: "study",
    days: [
      0,
      3
    ],
    minutes: 60,
    units: [
      {
        id: "fastapi-1",
        name: "Setup & your first FastAPI app"
      },
      {
        id: "fastapi-2",
        name: "Path & query parameters"
      },
      {
        id: "fastapi-3",
        name: "Request bodies with Pydantic"
      },
      {
        id: "fastapi-4",
        name: "Response models, status codes & errors"
      },
      {
        id: "fastapi-5",
        name: "APIRouter & project structure"
      },
      {
        id: "fastapi-6",
        name: "Dependency injection"
      },
      {
        id: "fastapi-7",
        name: "SQLModel basics & database setup"
      },
      {
        id: "fastapi-8",
        name: "CRUD with a database"
      },
      {
        id: "fastapi-9",
        name: "Postgres & async sessions"
      },
      {
        id: "fastapi-10",
        name: "Relationships between models"
      },
      {
        id: "fastapi-11",
        name: "Migrations with Alembic"
      },
      {
        id: "fastapi-12",
        name: "Password hashing & users"
      },
      {
        id: "fastapi-13",
        name: "OAuth2 & JWT authentication"
      },
      {
        id: "fastapi-14",
        name: "Authorization & protected routes"
      },
      {
        id: "fastapi-15",
        name: "Background tasks & email"
      },
      {
        id: "fastapi-16",
        name: "Testing with Pytest"
      },
      {
        id: "fastapi-17",
        name: "Connecting a React frontend"
      },
      {
        id: "fastapi-18",
        name: "Docker & docker compose"
      },
      {
        id: "fastapi-19",
        name: "Deployment & final review"
      }
    ]
  },
  {
    id: "fp",
    name: "Backend from First Principles",
    by: "Sriniously · YouTube playlist",
    kind: "video",
    url: "https://youtube.com/playlist?list=PLui3EUkuMTPgZcV0QhQrOcwMPcBCcd_Q1",
    role: "study",
    days: [
      1,
      4
    ],
    minutes: 60,
    units: [
      {
        id: "fp-1",
        name: "1. Roadmap for backend from first principles"
      },
      {
        id: "fp-2",
        name: "2–4. The path, what a backend is, why first principles"
      },
      {
        id: "fp-3",
        name: "5. HTTP for backend engineers"
      },
      {
        id: "fp-4",
        name: "6–7. Routing + serialization"
      },
      {
        id: "fp-5",
        name: "8. Authentication & authorization · part 1"
      },
      {
        id: "fp-6",
        name: "8. Authentication & authorization · part 2"
      },
      {
        id: "fp-7",
        name: "9. Validations & transformations"
      },
      {
        id: "fp-8",
        name: "10. Controllers, services, repositories, middleware"
      },
      {
        id: "fp-9",
        name: "11. Complete REST API design · part 1"
      },
      {
        id: "fp-10",
        name: "11. Complete REST API design · part 2"
      },
      {
        id: "fp-11",
        name: "12. Databases with Postgres · part 1"
      },
      {
        id: "fp-12",
        name: "12. Databases with Postgres · part 2"
      },
      {
        id: "fp-13",
        name: "12. Databases with Postgres · part 3"
      },
      {
        id: "fp-14",
        name: "13. Caching"
      },
      {
        id: "fp-15",
        name: "14. Task queues & background jobs"
      },
      {
        id: "fp-16",
        name: "15. Full-text search with Elasticsearch"
      },
      {
        id: "fp-17",
        name: "16. Error handling & fault tolerance"
      },
      {
        id: "fp-18",
        name: "17–18. Config management + logging & observability"
      },
      {
        id: "fp-19",
        name: "19. Graceful shutdown"
      },
      {
        id: "fp-20",
        name: "20. Backend security · part 1"
      },
      {
        id: "fp-21",
        name: "20. Backend security · part 2"
      },
      {
        id: "fp-22",
        name: "20. Backend security · part 3"
      },
      {
        id: "fp-23",
        name: "21.1 Scaling & performance · part 1a"
      },
      {
        id: "fp-24",
        name: "21.1 Scaling & performance · part 1b"
      },
      {
        id: "fp-25",
        name: "21.2 Scaling & performance · part 2a"
      },
      {
        id: "fp-26",
        name: "21.2 Scaling & performance · part 2b"
      },
      {
        id: "fp-27",
        name: "22. Concurrency & parallelism · part 1"
      },
      {
        id: "fp-28",
        name: "22. Concurrency & parallelism · part 2"
      },
      {
        id: "fp-29",
        name: "23. Object storage · part 1a"
      },
      {
        id: "fp-30",
        name: "23. Object storage · part 1b"
      },
      {
        id: "fp-31",
        name: "24. Object storage · part 2"
      },
      {
        id: "fp-32",
        name: "Newer videos in the playlist (25+)"
      }
    ]
  },
  {
    id: "book",
    name: "AI Engineering",
    by: "Chip Huyen · book (PDF pages)",
    kind: "book",
    role: "study",
    days: [
      2,
      5
    ],
    minutes: 60,
    units: [
      {
        id: "book-1",
        name: "Preface · pp. 13–24"
      },
      {
        id: "book-2",
        name: "Ch1 · The Rise of AI Engineering · pp. 26–39"
      },
      {
        id: "book-3",
        name: "Ch1 · Foundation Model Use Cases · pp. 40–51"
      },
      {
        id: "book-4",
        name: "Ch1 · Planning AI Applications · pp. 52–58"
      },
      {
        id: "book-5",
        name: "Ch1 · The AI Engineering Stack · pp. 59–72"
      },
      {
        id: "book-6",
        name: "Ch2 · Training Data · pp. 74–81"
      },
      {
        id: "book-7",
        name: "Ch2 · Modeling (1/2) · pp. 82–91"
      },
      {
        id: "book-8",
        name: "Ch2 · Modeling (2/2) · pp. 92–101"
      },
      {
        id: "book-9",
        name: "Ch2 · Post-Training · pp. 102–111"
      },
      {
        id: "book-10",
        name: "Ch2 · Sampling (1/2) · pp. 112–123"
      },
      {
        id: "book-11",
        name: "Ch2 · Sampling (2/2) · pp. 124–136"
      },
      {
        id: "book-12",
        name: "Ch3 · Challenges & LM metrics · pp. 138–148"
      },
      {
        id: "book-13",
        name: "Ch3 · Exact Evaluation · pp. 149–159"
      },
      {
        id: "book-14",
        name: "Ch3 · AI as a Judge · pp. 160–171"
      },
      {
        id: "book-15",
        name: "Ch3 · Comparative Evaluation · pp. 172–182"
      },
      {
        id: "book-16",
        name: "Ch4 · Evaluation Criteria (1/2) · pp. 184–193"
      },
      {
        id: "book-17",
        name: "Ch4 · Evaluation Criteria (2/2) · pp. 194–202"
      },
      {
        id: "book-18",
        name: "Ch4 · Model Selection (1/2) · pp. 203–213"
      },
      {
        id: "book-19",
        name: "Ch4 · Model Selection (2/2) · pp. 214–223"
      },
      {
        id: "book-20",
        name: "Ch4 · Evaluation Pipeline · pp. 224–234"
      },
      {
        id: "book-21",
        name: "Ch5 · Introduction to Prompting · pp. 236–243"
      },
      {
        id: "book-22",
        name: "Ch5 · Prompt Engineering Best Practices · pp. 244–258"
      },
      {
        id: "book-23",
        name: "Ch5 · Defensive Prompt Engineering · pp. 259–276"
      },
      {
        id: "book-24",
        name: "Ch6 · RAG (1/2) · pp. 277–287"
      },
      {
        id: "book-25",
        name: "Ch6 · RAG (2/2) · pp. 288–298"
      },
      {
        id: "book-26",
        name: "Ch6 · Agents (1/2) · pp. 299–311"
      },
      {
        id: "book-27",
        name: "Ch6 · Agents (2/2) · pp. 312–323"
      },
      {
        id: "book-28",
        name: "Ch6 · Memory · pp. 324–330"
      },
      {
        id: "book-29",
        name: "Ch7 · Finetuning overview & when · pp. 332–342"
      },
      {
        id: "book-30",
        name: "Ch7 · Memory Bottlenecks · pp. 343–355"
      },
      {
        id: "book-31",
        name: "Ch7 · Finetuning Techniques (1/2) · pp. 356–370"
      },
      {
        id: "book-32",
        name: "Ch7 · Finetuning Techniques (2/2) · pp. 371–386"
      },
      {
        id: "book-33",
        name: "Ch8 · Data Curation · pp. 389–403"
      },
      {
        id: "book-34",
        name: "Ch8 · Augmentation & Synthesis · pp. 404–419"
      },
      {
        id: "book-35",
        name: "Ch8 · Data Processing · pp. 420–428"
      },
      {
        id: "book-36",
        name: "Ch9 · Understanding Inference Opt. (1/2) · pp. 430–439"
      },
      {
        id: "book-37",
        name: "Ch9 · Understanding Inference Opt. (2/2) · pp. 440–449"
      },
      {
        id: "book-38",
        name: "Ch9 · Inference Optimization (1/2) · pp. 450–460"
      },
      {
        id: "book-39",
        name: "Ch9 · Inference Optimization (2/2) · pp. 461–472"
      },
      {
        id: "book-40",
        name: "Ch10 · AI Engineering Architecture (1/2) · pp. 473–485"
      },
      {
        id: "book-41",
        name: "Ch10 · AI Engineering Architecture (2/2) · pp. 486–497"
      },
      {
        id: "book-42",
        name: "Ch10 · User Feedback & Epilogue · pp. 498–520"
      }
    ]
  },
  {
    id: "rfp",
    name: "RFP Agent",
    by: "Your project · suggested milestones",
    kind: "project",
    role: "daily",
    days: [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ],
    minutes: 40,
    units: [
      {
        id: "rfp-1",
        name: "Scope: inputs, outputs & success criteria"
      },
      {
        id: "rfp-2",
        name: "Skeleton: onion layers, FastAPI app, Docker on VPS"
      },
      {
        id: "rfp-3",
        name: "Domain model: RFP, Requirement, ResponseSection"
      },
      {
        id: "rfp-4",
        name: "Repository interfaces + Postgres implementation"
      },
      {
        id: "rfp-5",
        name: "Ingestion: upload & parse RFP PDFs"
      },
      {
        id: "rfp-6",
        name: "Requirement extraction node (structured output)"
      },
      {
        id: "rfp-7",
        name: "Knowledge base: embed company docs for RAG"
      },
      {
        id: "rfp-8",
        name: "LangGraph flow: retrieve → draft → review"
      },
      {
        id: "rfp-9",
        name: "Compliance matrix: requirement → answer"
      },
      {
        id: "rfp-10",
        name: "API endpoints & background jobs for long runs"
      },
      {
        id: "rfp-11",
        name: "Evaluation set + LLM-as-judge scoring"
      },
      {
        id: "rfp-12",
        name: "Auth, logging & error handling"
      },
      {
        id: "rfp-13",
        name: "Tests: domain units + API integration"
      },
      {
        id: "rfp-14",
        name: "Export the response as DOCX/PDF"
      },
      {
        id: "rfp-15",
        name: "README, architecture diagram & demo"
      }
    ]
  }
],
  english: { classDays: [0, 3], practiceMinutes: 20, classMinutes: 60 },
};
