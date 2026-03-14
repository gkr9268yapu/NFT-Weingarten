import React from "react";
const ImagesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="m12 12-1-1-2 3h10l-4-6z"></path>
    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M8 16V4h12v12z"></path>
    <path d="M4 8H2v12c0 1.1.9 2 2 2h12v-2H4z"></path>
  </svg>
);
export default ImagesIcon;
