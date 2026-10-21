"use client";

import { createContext } from "react";
import type { ActionState } from "@/lib/action";

export const FormStateContext = createContext<ActionState | null>(null);
