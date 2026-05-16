import { Link } from "react-router-dom";
import { Video, ArrowRight } from "lucide-react";

export const Dashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-2">Track Anything Annotate</h1>
      <p className="text-muted-foreground mb-8 text-lg">
        Платформа для разметки видео с использованием SAM 2 + XMem.
      </p>

      <div className="grid gap-6 max-w-md">
        <Link
          to="/video"
          className="group block p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Video size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Разметка Видео</h2>
          <p className="text-muted-foreground mb-4">
            Загрузите видео, разметьте первый кадр — SAM 2 + XMem автоматически
            отследит объекты и соберёт датасет в нужном формате.
          </p>
          <div className="text-primary font-medium flex items-center gap-2">
            Начать <ArrowRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
};
