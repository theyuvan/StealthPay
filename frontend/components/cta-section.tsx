import { Button } from "@/components/ui/button"
import { Send, ScanLine, ShieldCheck, Github } from "lucide-react"
import Link from "next/link"

export default function CTASection() {
  return (
    <section className="py-20 px-4 bg-secondary text-secondary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6">Ready to send privately?</h2>
        <p className="text-xl mb-8 opacity-90">
          Try the full stealth address + ZK proof flow right in your browser.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/send">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-transparent border-secondary-foreground text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            >
              <Send className="mr-2 h-5 w-5" />
              Send a Stealth Payment
            </Button>
          </Link>
          <Link href="/receive">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-transparent border-secondary-foreground text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            >
              <ScanLine className="mr-2 h-5 w-5" />
              Scan for My Payments
            </Button>
          </Link>
          <Link href="/prove">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-transparent border-secondary-foreground text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            >
              <ShieldCheck className="mr-2 h-5 w-5" />
              Generate ZK Proof
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
