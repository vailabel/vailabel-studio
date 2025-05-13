import { createContext } from "react";
import { AnnotationsContextType } from "./annotations-context-provider";




export const AnnotationsContext = createContext<
  AnnotationsContextType | undefined
>(undefined)
