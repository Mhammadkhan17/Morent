import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => {
  return (
    <span className={cn("inline-block text-primary text-2xl font-bold", className)}>
      Morent
    </span>
  );
};

export default Logo;
