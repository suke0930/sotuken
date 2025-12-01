import { Session as AuthSession } from "@auth/express";

declare module "express" {
  interface Locals {
    session?: AuthSession | null;
  }
}
