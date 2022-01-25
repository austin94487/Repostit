// if window is active (which is accessible in the browser), returns true
// if the window is undefined, return false
export const isServer = () => typeof window === "undefined";
