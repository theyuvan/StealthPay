"use client"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Check, Circle } from "lucide-react"

interface TimelineEvent {
  id: string
  title: string
  date: string
  description?: string
  status?: "completed" | "current" | "upcoming"
}

interface HorizontalTimelineProps {
  events?: TimelineEvent[]
  className?: string
}

const HorizontalTimeline = ({ events = [], className }: HorizontalTimelineProps) => {
  return (
    <div className={cn("w-full bg-background", className)}>
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0 p-8 min-w-max">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-center">
              {/* Event Node */}
              <div className="flex flex-col items-center min-w-[200px]">
                {/* Date */}
                <div className="text-xs text-muted-foreground mb-2 font-medium">{event.date}</div>

                {/* Dot */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-4 h-4 rounded-full border-2 bg-background z-10",
                    event.status === "completed" && "border-primary bg-primary",
                    event.status === "current" && "border-primary bg-background",
                    event.status === "upcoming" && "border-muted-foreground bg-background",
                  )}
                >
                  {event.status === "completed" && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  {event.status === "current" && <Circle className="w-2 h-2 fill-primary text-primary" />}
                </div>

                {/* Title and Description */}
                <div className="mt-4 text-center max-w-[180px]">
                  <h3
                    className={cn(
                      "font-medium mb-1 text-sm leading-tight",
                      event.status === "completed" && "text-foreground",
                      event.status === "current" && "text-primary",
                      event.status === "upcoming" && "text-muted-foreground",
                    )}
                  >
                    {event.title.split(" ").length > 2 ? (
                      <>
                        {event.title
                          .split(" ")
                          .slice(0, Math.ceil(event.title.split(" ").length / 2))
                          .join(" ")}
                        <br />
                        {event.title
                          .split(" ")
                          .slice(Math.ceil(event.title.split(" ").length / 2))
                          .join(" ")}
                      </>
                    ) : (
                      event.title
                    )}
                  </h3>
                  {event.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {index < events.length - 1 && (
                <div
                  className={cn("h-0.5 w-16 -mx-8 z-0", event.status === "completed" ? "bg-primary" : "bg-border")}
                />
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default HorizontalTimeline
