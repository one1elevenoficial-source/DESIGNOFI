import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type FormState = {
  fullName: string;
  email: string;
  password: string;
};

function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const STAR_COUNT_BASE = 120;
    const LINK_DIST = 140;
    const SPEED = 0.18;

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    resize();

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const makeStars = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.sqrt((w * h) / (1200 * 800));
      const count = Math.max(80, Math.floor(STAR_COUNT_BASE * scale));
      return Array.from({ length: count }).map(() => ({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-SPEED, SPEED),
        vy: rand(-SPEED, SPEED),
        r: rand(0.6, 1.8),
        a: rand(0.35, 0.9),
      }));
    };

    let stars = makeStars();

    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const grd = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        0,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * 0.75
      );
      grd.addColorStop(0, "rgba(0,232,94,0.06)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(200,255,225,${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i];
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.22;
            ctx.strokeStyle = `rgba(0,232,94,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      stars = makeStars();
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "black",
        zIndex: 0,
      }}
    />
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length >= 3 &&
      form.email.trim().length >= 5 &&
      form.password.length >= 6 &&
      !loading
    );
  }, [form, loading]);

  const onChange =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!SUPABASE_ANON_KEY) {
        throw new Error(
          "Configuração do Supabase ausente. Contate o suporte."
        );
      }

      const full_name = form.fullName.trim();
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
        },
      });

      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;

      if (!userId) {
        setSuccessMsg(
          "Cadastro iniciado. Verifique seu email para confirmar a conta e depois faça login."
        );
        return;
      }

      const workspaceName =
        full_name.length > 0 ? `${full_name} Workspace` : "Meu workspace";

      const { data: wsRows, error: wsError } = await supabase
        .from("workspaces")
        .insert({ name: workspaceName })
        .select("id")
        .limit(1);

      if (wsError) throw wsError;

      const workspaceId = wsRows?.[0]?.id;
      if (!workspaceId) throw new Error("Não consegui obter o id do workspace criado.");

      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: userId,
        email,
        full_name,
        workspace_id: workspaceId,
        role: "owner",
      });

      if (profileError) throw profileError;

      navigate("/overview", { replace: true });
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error_description ||
        "Não foi possível concluir o cadastro. Tente novamente.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "black",
        color: "#eafff2",
      }}
    >
      <ConstellationBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px 16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 16,
            border: "1px solid rgba(0,232,94,0.35)",
            background: "rgba(0,0,0,0.65)",
            boxShadow: "0 0 0 1px rgba(0,232,94,0.12), 0 20px 60px rgba(0,0,0,0.65)",
            backdropFilter: "blur(10px)",
            padding: 20,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 0.2,
                color: "#00e85e",
              }}
            >
              ONE ELEVEN
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>
              Criar conta
            </div>
            <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>
              Crie sua conta e o workspace automaticamente.
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Nome completo</span>
              <input
                value={form.fullName}
                onChange={onChange("fullName")}
                autoComplete="name"
                placeholder="Seu nome"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Email</span>
              <input
                value={form.email}
                onChange={onChange("email")}
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Senha</span>
              <input
                value={form.password}
                onChange={onChange("password")}
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                style={inputStyle}
              />
            </label>

            {errorMsg && (
              <div
                style={{
                  border: "1px solid rgba(255, 60, 60, 0.35)",
                  background: "rgba(255, 60, 60, 0.08)",
                  color: "#ffd0d0",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13,
                }}
              >
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  border: "1px solid rgba(0,232,94,0.35)",
                  background: "rgba(0,232,94,0.08)",
                  color: "#caffdf",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13,
                }}
              >
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                marginTop: 6,
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(0,232,94,0.55)",
                background: canSubmit ? "#00e85e" : "rgba(0,232,94,0.18)",
                color: canSubmit ? "#04150b" : "rgba(234,255,242,0.8)",
                fontWeight: 800,
                letterSpacing: 0.2,
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 0 26px rgba(0,232,94,0.25)" : "none",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
              onMouseDown={(e) => {
                if (canSubmit) (e.currentTarget.style.transform = "translateY(1px)");
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
              }}
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
              Já tem conta?{" "}
              <Link
                to="/login"
                style={{
                  color: "#00e85e",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Entrar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(0,232,94,0.28)",
  background: "rgba(0,0,0,0.55)",
  color: "#eafff2",
  padding: "0 12px",
  outline: "none",
  boxShadow: "0 0 0 1px rgba(0,0,0,0)",
};
