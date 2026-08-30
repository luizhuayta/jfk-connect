/**
 * Catálogo completo de herramientas del asistente — IJFK.
 */

import { COMMON_TOOLS } from "@/lib/ai/tools/common";
import { PADRE_TOOLS } from "@/lib/ai/tools/padre";
import { DOCENTE_TOOLS } from "@/lib/ai/tools/docente";
import { ADMIN_TOOLS } from "@/lib/ai/tools/admin";
import type { AssistantTool } from "@/lib/ai/tools/registry";

export const ALL_TOOLS: AssistantTool[] = [...COMMON_TOOLS, ...PADRE_TOOLS, ...DOCENTE_TOOLS, ...ADMIN_TOOLS];
