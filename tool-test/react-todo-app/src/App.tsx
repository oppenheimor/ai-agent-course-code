import { useState, useEffect } from 'react';
import './App.css';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
  category: 'work' | 'personal' | 'other';
};

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [category, setCategory] = useState<'work' | 'personal' | 'other'>('personal');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
        category
      }]);
      setInputValue('');
      setCategory('personal');
    }
  };

  const removeTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleComplete = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const startEdit = (todo: Todo) => {
    setEditId(todo.id);
    setEditText(todo.text);
    setCategory(todo.category);
  };

  const saveEdit = () => {
    if (editId !== null && editText.trim()) {
      setTodos(todos.map(todo =>
        todo.id === editId ? { ...todo, text: editText.trim(), category } : todo
      ));
      setEditId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText('');
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return (
    <div className="app-container">
      <div className="todo-app">
        <h1>TodoList</h1>
        
        <div className="stats">
          <div className="stat-item">
            <span className="label">全部</span>
            <span className="value">{todos.length}</span>
          </div>
          <div className="stat-item">
            <span className="label">进行中</span>
            <span className="value active">{activeCount}</span>
          </div>
          <div className="stat-item">
            <span className="label">已完成</span>
            <span className="value completed">{completedCount}</span>
          </div>
        </div>

        <div className="input-section">
          {editId === null ? (
            <>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                placeholder="添加新任务..."
                className="todo-input"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'work' | 'personal' | 'other')}
                className="category-select"
              >
                <option value="personal">个人</option>
                <option value="work">工作</option>
                <option value="other">其他</option>
              </select>
              <button onClick={addTodo} className="add-button">
                添加
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                className="todo-input editing"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'work' | 'personal' | 'other')}
                className="category-select"
              >
                <option value="personal">个人</option>
                <option value="work">工作</option>
                <option value="other">其他</option>
              </select>
              <div className="edit-actions">
                <button onClick={saveEdit} className="save-button">保存</button>
                <button onClick={cancelEdit} className="cancel-button">取消</button>
              </div>
            </>
          )}
        </div>

        <div className="filters">
          <button 
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            全部
          </button>
          <button 
            onClick={() => setFilter('active')}
            className={filter === 'active' ? 'active' : ''}
          >
            进行中
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? 'active' : ''}
          >
            已完成
          </button>
        </div>

        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''} ${todo.category}`}
            >
              <div className="todo-content">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleComplete(todo.id)}
                  className="todo-checkbox"
                />
                <span className="todo-text">{todo.text}</span>
                <span className="category-badge">{todo.category === 'personal' ? '个人' : todo.category === 'work' ? '工作' : '其他'}</span>
              </div>
              <div className="todo-actions">
                <button 
                  onClick={() => startEdit(todo)}
                  className="edit-button"
                  disabled={editId !== null}
                >
                  编辑
                </button>
                <button 
                  onClick={() => removeTodo(todo.id)}
                  className="delete-button"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filteredTodos.length === 0 && (
          <div className="empty-state">
            {filter === 'all' && '暂无任务'}
            {filter === 'active' && '暂无进行中任务'}
            {filter === 'completed' && '暂无已完成任务'}
          </div>
        )}
      </div>
    </div>
  )
}

export default App;