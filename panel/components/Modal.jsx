"use client";
import DraggableWindow from './DraggableWindow';

export default function Modal({ isOpen, onClose, title, children, width = '440px', id }) {
  return (
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={width}
      type="modal"
      id={id}
    >
      {children}
    </DraggableWindow>
  );
}
