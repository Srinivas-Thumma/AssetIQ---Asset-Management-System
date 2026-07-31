# 01. AssetIQ — Project Overview

## What is AssetIQ?
**AssetIQ** is an enterprise-grade, multi-tenant SaaS Asset Management Platform designed for modern organizations to track physical assets, manage employee custody, automate maintenance servicing workflows, track financial valuation and warranty policies, and perform AI-driven health scoring and predictive failure analysis.

Built on a decoupled **MERN stack** architecture (Node.js/Express backend + React 18 frontend) with **Socket.IO** real-time messaging and an on-premise **Ollama LLM** integration, AssetIQ provides multi-tenant data isolation, role-based access control (RBAC), and automated lifecycle triggers.

---

## Problem Statement
Organizations struggle with managing physical IT and hardware infrastructure due to:
1. **Ghost Assets & Custody Drift:** Assets assigned to employees are lost or unreturned during staff offboarding.
2. **Reactive Maintenance:** Equipment is only repaired after catastrophic failure, increasing downtime and replacement costs.
3. **Cross-Tenant Data Security Leakage:** Multi-tenant SaaS platforms often suffer from accidental data leaks between organizations when manual `.where({ organizationId })` filters are missed in controller code.
4. **Data Privacy in AI Analytics:** Cloud-based AI APIs (e.g. OpenAI) expose sensitive inventory and financial data to external vendors and incur high recurring API fees.

---

## Strategic Goals
- **Automated Lifecycle Custody:** Enforce strict custody tracking, preventing ghost assets during offboarding via automated return-to-stock workflows.
- **Predictive & Proactive Maintenance:** Leverage local AI models to evaluate asset age, servicing frequency, and repair costs, recommending preventative servicing before failures occur.
- **Zero-Trust Multi-Tenancy:** Enforce automatic, thread-local data isolation at the Mongoose ORM layer via Node.js `AsyncLocalStorage` and custom schema plugins.
- **Privacy-First On-Premise AI:** Run local Ollama LLMs (`qwen2.5:3b` / `llama3.1:8b`) to ensure zero sensitive inventory data leaves company infrastructure.

---

## Core System Features

### 1. Multi-Tenant Enterprise Workspace Management
- Organization registration & plan subscription provisioning (`Free`, `Pro`, `Enterprise`).
- Dual-form provisioning modal allowing Super Admins to create tenants and assign tenant Organization Admins.
- Strict multi-tenant isolation guaranteeing zero cross-tenant data leaks.

### 2. Asset Registry & Location Hierarchy
- Comprehensive asset management with category, vendor, price, purchase date, and custody tracking.
- Printable base64 QR code generation for field inspection and verification.
- Hierarchical location modeling: `Branch Site` -> `Building` -> `Floor` -> `Room`.

### 3. Option B Maintenance Lifecycle & Servicing
- **"Mark Damaged" Trigger:** Marking an asset as damaged retains its status as `'damaged'` and automatically generates a high-priority open corrective maintenance ticket.
- **Work Commenced Transition:** Moving ticket status to `'assigned'` or `'in_progress'` automatically transitions asset status to `'under_maintenance'`.
- **Custody Restoration:** Resolving a repair logs invoice costs and automatically restores asset status to `'assigned'` (if assigned to an employee) or `'available'` (if unassigned).

### 4. Real-Time Maintenance Chat Drawer
- Ticket-isolated real-time chat over Socket.IO WebSockets between technicians, asset managers, and ticket submitters.
- Room isolation based on JWT socket authentication (`chat:request:<requestId>`).

### 5. Automated Employee Offboarding
- Intercepts employee deletion attempts when assigned assets are held in custody.
- Provides a dedicated `OffboardingChecklistModal` to bulk-return assigned assets to stock (`POST /api/v1/offboarding/:empId/return-all`) before completing staff deletion.

### 6. AI Asset Health Scoring & Predictive Analytics
- 4-tier decision tree analyzing asset age, servicing frequency, and invoice costs.
- Generates 0-100 Health Score, Failure Risk %, Remaining Useful Life (RUL) in months, and recommended servicing dates using local Ollama LLMs.
