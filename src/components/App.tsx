import { Editor } from './Editor';
import { CommentSidebar } from './CommentSidebar';
import { CopyXmlButton } from './CopyXmlButton';

export function App() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-auto">
        <Editor />
      </div>
      <div className="w-80 border-l border-gray-200 flex flex-col">
        <CommentSidebar />
        <CopyXmlButton />
      </div>
    </div>
  );
}
