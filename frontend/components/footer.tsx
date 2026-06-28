import Link from "next/link"

export default function Footer() {
  return (
    <footer className="relative py-16 md:py-32 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 232, 240, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "20px 30px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 100%, #000 60%, transparent 100%)",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 100%, #000 60%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <span className="block text-center text-sm text-primary/80 font-semibold">
          © {new Date().getFullYear()} ZK Stellar — Built for DoraHacks Stellar ZK Hackathon
        </span>
      </div>
    </footer>
  )
}
