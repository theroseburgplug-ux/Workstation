import { 
  Client, 
  Task, 
  Integration, 
  VoiceRecording, 
  ClientStatus, 
  TaskStatus, 
  Priority 
} from "../lib/index";

export const mockClients: Client[] = [
  {
    id: "c1",
    name: "Alex Rivers",
    email: "alex@lumina-tech.com",
    company: "Lumina Tech Solutions",
    status: "active" as ClientStatus,
    lastContact: "2026-02-12",
    revenue: 12500,
    tags: ["SaaS", "High Priority"],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
  },
  {
    id: "c2",
    name: "Sarah Jenkins",
    email: "s.jenkins@urban-roots.org",
    company: "Urban Roots Eco-Shop",
    status: "onboarding" as ClientStatus,
    lastContact: "2026-02-14",
    revenue: 4200,
    tags: ["E-commerce", "Green Energy"],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
  },
  {
    id: "c3",
    name: "Marcus Thorne",
    email: "m.thorne@vanguard-logistics.com",
    company: "Vanguard Logistics",
    status: "active" as ClientStatus,
    lastContact: "2026-02-10",
    revenue: 8900,
    tags: ["B2B", "Enterprise"],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
  },
  {
    id: "c4",
    name: "Elena Rodriguez",
    email: "elena@artisan-bakery.io",
    company: "The Artisan Bakery Co.",
    status: "pending" as ClientStatus,
    lastContact: "2026-02-01",
    revenue: 0,
    tags: ["Local Business", "SEO Project"],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
  },
  {
    id: "c5",
    name: "David Chen",
    email: "d.chen@nexus-gaming.net",
    company: "Nexus Gaming Labs",
    status: "inactive" as ClientStatus,
    lastContact: "2025-12-20",
    revenue: 15000,
    tags: ["Gaming", "Social Media"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
  }
];

export const mockTasks: Task[] = [
  {
    id: "t1",
    title: "Q1 Content Strategy Review",
    description: "Review and finalize the content calendar for Lumina Tech for the first quarter of 2026.",
    clientId: "c1",
    clientName: "Lumina Tech Solutions",
    status: "in-progress" as TaskStatus,
    priority: "high" as Priority,
    dueDate: "2026-02-20",
    assignedTo: "John Doe",
    createdAt: "2026-02-10"
  },
  {
    id: "t2",
    title: "Instagram Ad Campaign Launch",
    description: "Setup and launch the spring collection ads on Instagram and Facebook Meta Business Suite.",
    clientId: "c2",
    clientName: "Urban Roots Eco-Shop",
    status: "todo" as TaskStatus,
    priority: "urgent" as Priority,
    dueDate: "2026-02-15",
    assignedTo: "Jane Smith",
    createdAt: "2026-02-13"
  },
  {
    id: "t3",
    title: "Monthly SEO Audit",
    description: "Perform a comprehensive SEO audit and keyword gap analysis for Vanguard Logistics.",
    clientId: "c3",
    clientName: "Vanguard Logistics",
    status: "review" as TaskStatus,
    priority: "medium" as Priority,
    dueDate: "2026-02-25",
    assignedTo: "John Doe",
    createdAt: "2026-02-05"
  },
  {
    id: "t4",
    title: "Website Landing Page Draft",
    description: "Draft the copy for the new 'Artisan Choice' subscription landing page.",
    clientId: "c4",
    clientName: "The Artisan Bakery Co.",
    status: "completed" as TaskStatus,
    priority: "low" as Priority,
    dueDate: "2026-02-12",
    assignedTo: "Jane Smith",
    createdAt: "2026-02-01"
  },
  {
    id: "t5",
    title: "Influencer Outreach Phase 1",
    description: "Identify and contact 20 potential gaming influencers for the Nexus Pro headset launch.",
    clientId: "c5",
    clientName: "Nexus Gaming Labs",
    status: "todo" as TaskStatus,
    priority: "medium" as Priority,
    dueDate: "2026-03-05",
    assignedTo: "Alice Cooper",
    createdAt: "2026-02-10"
  }
];

export const mockIntegrations: Integration[] = [
  {
    id: "i1",
    name: "Facebook Meta",
    category: "ads",
    status: "connected",
    icon: "SiFacebook",
    lastSync: "2026-02-14 01:15",
    description: "Manage ad campaigns and page engagement across Facebook and Instagram."
  },
  {
    id: "i2",
    name: "X (Twitter)",
    category: "social",
    status: "connected",
    icon: "SiX",
    lastSync: "2026-02-14 01:30",
    description: "Schedule tweets and monitor brand mentions in real-time."
  },
  {
    id: "i3",
    name: "LinkedIn Business",
    category: "social",
    status: "error",
    icon: "SiLinkedin",
    lastSync: "2026-02-12 14:20",
    description: "B2B networking and professional content distribution."
  },
  {
    id: "i4",
    name: "HubSpot CRM",
    category: "crm",
    status: "connected",
    icon: "SiHubspot",
    lastSync: "2026-02-13 23:55",
    description: "Sync client data, deal stages, and communication history."
  },
  {
    id: "i5",
    name: "Google Drive",
    category: "storage",
    status: "disconnected",
    icon: "SiGoogledrive",
    description: "Store and manage shared creative assets and project documents."
  }
];

export const mockVoiceRecordings: VoiceRecording[] = [
  {
    id: "v1",
    title: "Project Discovery Meeting - Urban Roots",
    duration: "12:45",
    date: "2026-02-13",
    size: "15.4 MB",
    fileUrl: "#",
    clientId: "c2",
    transcript: "The client expressed interest in a more organic feel for the new branding. We discussed the timeline for the spring launch..."
  },
  {
    id: "v2",
    title: "Internal Strategy Sync - Q1",
    duration: "45:20",
    date: "2026-02-10",
    size: "62.1 MB",
    fileUrl: "#",
    transcript: "Reviewing the agency performance for January. Revenue is up by 15%. Focus for Q1 should be on high-ticket retainer clients..."
  },
  {
    id: "v3",
    title: "Client Feedback - Lumina Tech",
    duration: "05:12",
    date: "2026-02-12",
    size: "8.2 MB",
    fileUrl: "#",
    clientId: "c1",
    transcript: "Quick feedback on the landing page mockups. They like the color palette but want the CTA button to be more prominent..."
  }
];
