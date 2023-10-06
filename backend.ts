/* MIDDLEWARE FOR PRISMA MANAGER */

import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { PrismaClient } from "prisma/generated/auth-client";
import jwt_decode from "jwt-decode";

@Injectable()
export class WorkspaceValidationMiddleware implements NestMiddleware {
  private prismaAuth: PrismaClient;

  constructor() {
    this.prismaAuth = new PrismaClient();
  }

  async use(req: any, res: any, next: () => void) {
    const jwt = req.headers.authorization.split(" ")[1];
    const decodedJwt = jwt_decode(jwt);
    const userId = decodedJwt["sub"];

    const availableWorkspaces =
      await this.prismaAuth.users_x_workspaces.findMany({
        where: {
          userId,
          workspaceId: req.headers["x-workspace-id"],
        },
      });

    if (availableWorkspaces.length === 0) {
      throw new ForbiddenException("Workspace not found");
    }

    const workspaceId = req.headers["x-workspace-id"];

    const workspace = await this.prismaAuth.workspaces.findUnique({
      where: {
        id: workspaceId,
      },
    });

    if (!workspace) {
      throw new ForbiddenException("Workspace not found");
    }

    req.headers["x-workspace-id"] = workspace.dbName;

    next();
  }
}

/* PRISMA MULTI TANENT HANDLING */

import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { PrismaClient } from "prisma/generated/main-client";

@Injectable()
export class PrismaClientManager {
  private clients: { [key: string]: PrismaClient } = {};

  getTenantId(request: Request): string {
    return request.headers["x-workspace-id"] as string;
  }

  getClient(request: Request): PrismaClient {
    const tenantId = this.getTenantId(request);
    let client = this.clients[tenantId];

    if (!client) {
      const databaseUrl = process.env.DATABASE_URL!.replace("public", tenantId);

      client = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      this.clients[tenantId] = client;
    }

    return client;
  }
}
