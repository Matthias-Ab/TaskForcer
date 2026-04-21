export const spring = {
    type: 'spring',
    stiffness: 260,
    damping: 26,
};
export const springFast = {
    type: 'spring',
    stiffness: 340,
    damping: 30,
};
export const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
};
export const slideUp = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: spring },
    exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};
export const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: spring },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.1 } },
};
export const listItem = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: spring },
    exit: { opacity: 0, x: 8, height: 0, transition: { duration: 0.2 } },
};
export const pageTransition = {
    hidden: { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0, transition: { ...spring, duration: 0.25 } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.15 } },
};
export const checkmark = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: { pathLength: { duration: 0.3, ease: 'easeOut' }, opacity: { duration: 0.1 } },
    },
};
