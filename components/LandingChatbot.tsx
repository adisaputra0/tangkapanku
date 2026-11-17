"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Apa itu TangkapanKu?",
  "Bagaimana cara input suara & nota?",
  "Bagaimana rumus skor kreditnya?",
  "Info akun demo untuk mencoba",
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Halo! Saya asisten virtual TangkapanKu. Ada yang ingin ditanyakan seputar fitur buku kas suara/nota, laporan malam otomatis, atau akun demo?",
};

export default function LandingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.error ||
              "Maaf, layanan asisten sedang sibuk. Silakan coba sesaat lagi.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Koneksi terputus. Periksa jaringan internet Anda.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Jendela Panel Chat */}
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-3rem)] sm:w-[390px] rounded-[28px] border border-[#22382e] bg-[#0d1017] shadow-2xl overflow-hidden flex flex-col">
          {/* Header Chat */}
          <div className="px-5 py-4 bg-[#101c17] border-b border-[#22382e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9">
                <Image
                  src="/images/logo.png"
                  alt="Logo TangkapanKu"
                  width={500}
                  height={500}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-[0.16em] text-white uppercase">
                    Asisten TangkapanKu
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#4ec38e]" />
                </div>
                <span className="text-[10px] font-mono text-[#8b94a5] block">
                  Gemini 2.5 Flash • Tanya Fitur &amp; Demo
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMessages([INITIAL_MESSAGE])}
                title="Mulai ulang chat"
                className="w-8 h-8 rounded-full border border-[#262c3a] bg-[#11141b] text-[#8b94a5] hover:text-white text-xs flex items-center justify-center transition-colors"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup Chatbot"
                className="w-8 h-8 rounded-full border border-[#262c3a] bg-[#11141b] text-[#8b94a5] hover:text-white text-xs flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Area Riwayat Pesan */}
          <div className="p-4 h-[330px] overflow-y-auto space-y-3 bg-[#090b0e]">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                      isUser
                        ? "bg-[#158052] text-white rounded-br-sm"
                        : "bg-[#11141b] border border-[#1e232e] text-[#dce1ea] rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-[#11141b] border border-[#1e232e] text-[#4ec38e] font-mono text-[11px]">
                  Sedang mengetik...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Pertanyaan Cepat (Muncul saat chat baru dimulai) */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2.5 bg-[#0c0f14] border-t border-[#1e232e] flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-[#22382e] bg-[#101c17] text-[#4ec38e] hover:bg-[#158052] hover:text-white transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-[#0d1017] border-t border-[#1e232e] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya fitur TangkapanKu..."
              disabled={isLoading}
              className="flex-1 bg-[#11141b] border border-[#262c3a] focus:border-[#34a875] rounded-full px-4 py-2.5 text-xs text-white placeholder-[#6d7687] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Kirim Pesan"
              className="w-9 h-9 shrink-0 rounded-full bg-[#158052] hover:bg-[#19935f] disabled:opacity-40 text-white flex items-center justify-center text-xs font-bold transition-colors"
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* Tombol Floating Pojok Kanan Bawah */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Buka Asisten TangkapanKu"
        className="group flex items-center gap-3 rounded-full bg-[#158052] hover:bg-[#19935f] border border-[#2e6f52] text-white px-5 py-3.5 shadow-2xl transition-all duration-200"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <span className="text-xs uppercase tracking-[0.18em] font-bold">
          {isOpen ? "Tutup Chat" : "Tanya AI"}
        </span>
      </button>
    </div>
  );
}
