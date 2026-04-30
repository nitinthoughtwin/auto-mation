interface YouTubeIconProps {
  className?: string;
  size?: number;
}

// Official YouTube icon SVG per YouTube Brand Guidelines:
// https://www.youtube.com/howyoutubeworks/resources/brand-resources/
export function YouTubeIcon({ className, size = 24 }: YouTubeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-label="YouTube"
      role="img"
    >
      <path
        d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088C19.549 3.6 12 3.6 12 3.6s-7.549 0-9.407.517A3.007 3.007 0 0 0 .505 6.205 31.247 31.247 0 0 0 0 12a31.247 31.247 0 0 0 .505 5.795 3.007 3.007 0 0 0 2.088 2.088C4.451 20.4 12 20.4 12 20.4s7.549 0 9.407-.517a3.007 3.007 0 0 0 2.088-2.088A31.247 31.247 0 0 0 24 12a31.247 31.247 0 0 0-.505-5.795z"
        fill="#FF0000"
      />
      <path d="M9.6 15.6V8.4l6.4 3.6-6.4 3.6z" fill="#FFFFFF" />
    </svg>
  );
}
