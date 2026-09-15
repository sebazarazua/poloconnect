import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { AddressInfo } from "net";

jest.mock("./auth.service", () => ({ AuthService: class AuthService {} }));

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("POST /api/v1/auth/register password length", () => {
  let app: INestApplication;
  let baseUrl: string;
  const register = jest.fn();

  beforeAll(async () => {
    register.mockImplementation(async (dto) => ({
      accessToken: `access-${dto.username}`,
      refreshToken: `refresh-${dto.username}`,
      csrfToken: `csrf-${dto.username}`,
      expiresIn: 900
    }));

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { register } },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: unknown) => fallback } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, "127.0.0.1");

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    register.mockClear();
  });

  it.each([
    { length: 0, accepted: false },
    { length: 1, accepted: false },
    { length: 2, accepted: false },
    { length: 3, accepted: true },
    { length: 7, accepted: true },
    { length: 8, accepted: true },
    { length: 12, accepted: true }
  ])("handles a $length-character password", async ({ length, accepted }) => {
    const unique = `${length}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = {
      firstName: "Test",
      lastName: "User",
      email: `password-${unique}@example.com`,
      username: `password-${unique}`,
      password: "x".repeat(length)
    };

    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(accepted ? 201 : 400);
    if (accepted) {
      expect(register).toHaveBeenCalledTimes(1);
      expect(register.mock.calls[0][0]).toEqual(expect.objectContaining(payload));
    } else {
      expect(register).not.toHaveBeenCalled();
    }
  });

  it("requires the password field", async () => {
    const unique = `missing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "User",
        email: `password-${unique}@example.com`,
        username: `password-${unique}`
      })
    });

    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });
});
