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
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold font-heading text-primary mb-2">ZK Stellar</h3>
          <p className="text-muted-foreground">Stealth Addresses + ZK Linkability Proofs on Stellar</p>
        </div>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/send" className="text-muted-foreground hover:text-primary block duration-150">
            Send
          </Link>
          <Link href="/receive" className="text-muted-foreground hover:text-primary block duration-150">
            Receive
          </Link>
          <Link href="/prove" className="text-muted-foreground hover:text-primary block duration-150">
            Prove
          </Link>
          <a href="https://dorahacks.io/hackathon/stellar-hacks-zk" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary block duration-150">
            DoraHacks
          </a>
        </div>

        <span className="block text-center text-sm text-primary/80 font-semibold">
          © {new Date().getFullYear()} ZK Stellar — Built for DoraHacks Stellar ZK Hackathon
        </span>
      </div>
    </footer>
  )
}
